import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { allocatePiecesFifo } from '../../../domain/fifo.js';
import { AppError } from '../../../shared/errors.js';
import { inTransaction } from '../../../shared/database.js';
import type {
  FruitGrade,
  FruitSize,
} from '../../inventory/register-harvest/register-harvest.command.js';

interface InventoryLotRow extends RowDataPacket {
  id: number;
  available_pieces: number;
}

interface PriceRow extends RowDataPacket {
  price_per_kilogram: string;
}

export interface CompleteSaleCommand {
  customer: {
    name: string;
    address: string;
    contactNumber: string;
    emailAddress: string;
  };
  items: Array<{
    size: FruitSize;
    grade: FruitGrade;
    pieces: number;
    totalWeightKilograms: string;
  }>;
  payment: {
    method: 'CASH' | 'GCASH' | 'MAYA' | 'OTHER_E_WALLET' | 'BANK_TRANSFER';
    amountPaid: string;
    reference?: string | undefined;
    otherEWalletProvider?: string | undefined;
  };
  completedBy: string;
}

export function calculateChangeDue(
  method: CompleteSaleCommand['payment']['method'],
  amountPaid: number,
  total: number,
): number {
  if (method === 'CASH') {
    if (amountPaid < total) {
      throw new AppError(400, 'The payment amount is less than the transaction total.', 'UNDERPAYMENT');
    }
    return amountPaid - total;
  }
  if (Math.abs(amountPaid - total) > 0.005) {
    throw new AppError(400, 'Electronic payment must equal the transaction total.', 'PAYMENT_AMOUNT_MISMATCH');
  }
  return 0;
}

async function findPrice(
  connection: PoolConnection,
  grade: FruitGrade,
  size: FruitSize,
): Promise<string> {
  const [prices] = await connection.execute<PriceRow[]>(
    `SELECT price_per_kilogram
     FROM fruit_prices
     WHERE grade = ?
       AND is_active = 1
       AND (size = ? OR (grade = 'C' AND size IS NULL))
     ORDER BY effective_from DESC
     LIMIT 1`,
    [grade, size],
  );

  const price = prices[0]?.price_per_kilogram;
  if (!price) {
    throw new AppError(409, `No active price exists for Grade ${grade}, ${size}.`, 'PRICE_NOT_CONFIGURED');
  }
  return price;
}

async function allocateFifo(
  connection: PoolConnection,
  size: FruitSize,
  grade: FruitGrade,
  requestedPieces: number,
) {
  const [lots] = await connection.execute<InventoryLotRow[]>(
    `SELECT i.id, i.available_pieces
     FROM inventory AS i
     INNER JOIN harvest_batches AS hb ON hb.id = i.harvest_batch_id
     WHERE i.size = ? AND i.grade = ? AND i.available_pieces > 0
     ORDER BY hb.harvest_date ASC, i.id ASC
     FOR UPDATE`,
    [size, grade],
  );

  try {
    return allocatePiecesFifo(
      lots.map((lot) => ({
        id: lot.id,
        availablePieces: lot.available_pieces,
      })),
      requestedPieces,
    );
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const availablePieces = lots.reduce((total, lot) => total + lot.available_pieces, 0);
    throw new AppError(
      409,
      `Only ${availablePieces} matching pieces are available; ${requestedPieces} were requested.`,
      'INSUFFICIENT_INVENTORY',
    );
  }
}

export async function completeSale(command: CompleteSaleCommand) {
  return inTransaction(async (connection) => {
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales
         (customer_name, customer_address, customer_contact_number, customer_email,
          status, payment_status, payment_method, amount_paid, payment_reference,
          other_ewallet_provider, currency, completed_by, completed_at)
       VALUES (?, ?, ?, ?, 'COMPLETED', 'PAID', ?, ?, ?, ?, 'PHP', ?, UTC_TIMESTAMP())`,
      [
        command.customer.name,
        command.customer.address,
        command.customer.contactNumber,
        command.customer.emailAddress,
        command.payment.method,
        command.payment.amountPaid,
        command.payment.reference ?? null,
        command.payment.otherEWalletProvider ?? null,
        command.completedBy,
      ],
    );

    let transactionTotal = 0;
    for (const item of command.items) {
      const price = await findPrice(connection, item.grade, item.size);
      const subtotal = Number(item.totalWeightKilograms) * Number(price);
      transactionTotal += subtotal;

      const [saleItemResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO sales_items
           (sale_id, size, grade, pieces, total_weight_kilograms,
            price_per_kilogram, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saleResult.insertId,
          item.size,
          item.grade,
          item.pieces,
          item.totalWeightKilograms,
          price,
          subtotal.toFixed(2),
        ],
      );

      const allocations = await allocateFifo(
        connection,
        item.size,
        item.grade,
        item.pieces,
      );

      for (const allocation of allocations) {
        await connection.execute(
          `UPDATE inventory
           SET available_pieces = available_pieces - ?
           WHERE id = ?`,
          [allocation.pieces, allocation.inventoryId],
        );
        await connection.execute(
          `INSERT INTO sale_inventory_allocations
             (sale_item_id, inventory_id, pieces)
           VALUES (?, ?, ?)`,
          [saleItemResult.insertId, allocation.inventoryId, allocation.pieces],
        );
        await connection.execute(
          `INSERT INTO inventory_transactions
             (inventory_id, transaction_type, pieces, related_sale_id, created_by)
           VALUES (?, 'SALE_OUT', ?, ?, ?)`,
          [allocation.inventoryId, -allocation.pieces, saleResult.insertId, command.completedBy],
        );
      }
    }

    const changeDue = calculateChangeDue(
      command.payment.method,
      Number(command.payment.amountPaid),
      transactionTotal,
    );

    await connection.execute(
      `UPDATE sales
       SET total_amount = ?, change_due = ?
       WHERE id = ?`,
      [
        transactionTotal.toFixed(2),
        changeDue.toFixed(2),
        saleResult.insertId,
      ],
    );

    return {
      id: saleResult.insertId,
      totalAmount: transactionTotal.toFixed(2),
      totalPieces: command.items.reduce((total, item) => total + item.pieces, 0),
    };
  });
}
