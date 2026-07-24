import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SalesApiService, type FruitPrice, type SaleSummary } from '../../core/sales-api.service';
import { InventoryApiService, type InventoryLot } from '../../core/inventory-api.service';

interface OrderItem {
  id: number;
  size: 'EXTRA_SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'JUMBO';
  grade: 'A' | 'B' | 'C';
  pieces: number;
  weight: number;
  price: number;
  subtotal: number;
}

@Component({
  selector: 'dv-sales',
  imports: [CurrencyPipe, DatePipe, RouterLink, RouterLinkActive],
  template: `
    <section class="screen">
      <header class="hero"><div class="hero-top"><span></span><div><div class="brand">DRAGON-VIEW</div><h1>{{ pageTitle }}</h1></div><span></span></div>
        <nav class="sales-nav" aria-label="Sales sections">
          <a routerLink="/sales" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">History</a>
          <a routerLink="/sales/new" routerLinkActive="active">New Sale</a>
          @if (isOwner()) { <a routerLink="/sales/prices" routerLinkActive="active">Prices</a><a routerLink="/analytics">Analytics</a> }
        </nav>
      </header>
      <div class="content">
        @if (mode === 'checkout') {
        <article class="card panel">
          <div class="section-heading"><h2>New Sale</h2><span>PHP · priced per kilogram</span></div>
          <form #saleForm class="sale-form" (submit)="complete($event)">
            <fieldset><legend>Customer</legend>
              <input name="name" required placeholder="Name">
              <input name="address" required placeholder="Address">
              <input name="contactNumber" required minlength="7" placeholder="Contact number">
              <input name="emailAddress" required type="email" placeholder="Email address">
            </fieldset>
            <section class="order-items">
              <div class="section-heading"><h2>Fruit Items</h2><span>{{ orderItems().length }} item{{ orderItems().length === 1 ? '' : 's' }}</span></div>
              @for (line of orderItems(); track line.id) {
                <article class="order-item">
                  <span class="item-grade">Grade {{ line.grade }}</span>
                  <div><strong>{{ format(line.size) }}</strong><small>{{ line.pieces }} pieces · {{ line.weight }} kg · {{ line.price | currency:'PHP':'symbol-narrow' }}/kg</small></div>
                  <strong>{{ line.subtotal | currency:'PHP':'symbol-narrow' }}</strong>
                  <div class="item-actions"><button type="button" (click)="openItem(line)">Edit</button><button type="button" class="remove-item" (click)="removeItem(line.id)">Remove</button></div>
                </article>
              } @empty {
                <div class="empty-items">No fruit items yet. Add at least one item to continue.</div>
              }
              <button class="secondary add-item" type="button" (click)="openItem()">+ Add fruit item</button>
            </section>
            <fieldset><legend>Payment</legend>
              <select name="method" required (change)="changePaymentMethod($event, saleForm)"><option value="CASH">Cash</option><option value="GCASH">GCash</option><option value="MAYA">Maya</option><option value="OTHER_E_WALLET">Other e-wallet</option><option value="BANK_TRANSFER">Bank transfer</option></select>
              <input name="amountPaid" type="number" min="0" step="0.01" placeholder="Amount paid" (input)="recalculate(saleForm)">
              @if (paymentMethod() !== 'CASH') { <input name="reference" required placeholder="Payment reference"> }
              @if (paymentMethod() === 'OTHER_E_WALLET') { <input name="provider" required placeholder="E-wallet provider"> }
            </fieldset>
            <section class="payment-summary" aria-live="polite">
              <div><span>Items subtotal</span><strong>{{ grandTotal() | currency:'PHP':'symbol-narrow' }}</strong></div>
              <div><span>Amount {{ paymentMethod() === 'CASH' ? 'tendered' : 'paid' }}</span><strong>{{ amountPaid() | currency:'PHP':'symbol-narrow' }}</strong></div>
              @if (balanceDue() > 0) {
                <div class="due"><span>Balance due</span><strong>{{ balanceDue() | currency:'PHP':'symbol-narrow' }}</strong></div>
              } @else if (paymentMethod() !== 'CASH' && amountPaid() > grandTotal()) {
                <div class="due"><span>Payment mismatch</span><strong>Must equal total</strong></div>
              } @else if (paymentMethod() === 'CASH') {
                <div class="change"><span>Change</span><strong>{{ changeDue() | currency:'PHP':'symbol-narrow' }}</strong></div>
              }
            </section>
            <div class="submit-row">
              <button class="secondary" type="button" [disabled]="saving()" (click)="saveDraft(saleForm)">Save Draft</button>
              <button type="submit" [disabled]="saving()">{{ saving() ? 'Processing…' : 'Complete sale' }}</button>
            </div>
            @if (message()) { <p class="message" role="status">{{ message() }}</p> }
          </form>
        </article>
        @if (itemModalOpen()) {
          <div class="item-modal-backdrop" (click)="closeItem()">
            <form class="card item-modal" (submit)="saveItem($event)" (click)="$event.stopPropagation()">
              <div class="section-heading"><div><h2>{{ editingItem() ? 'Edit Fruit Item' : 'Add Fruit Item' }}</h2><span>Priced by total weight</span></div><button class="modal-close" type="button" (click)="closeItem()">×</button></div>
              <label>Fruit size<select name="size" [value]="itemSize()" (change)="changeItemSize($event)" required><option value="EXTRA_SMALL">Extra-Small</option><option value="SMALL">Small</option><option value="MEDIUM">Medium</option><option value="LARGE">Large</option><option value="JUMBO">Jumbo</option></select></label>
              <label>Grade<select name="grade" [value]="itemGrade()" (change)="changeItemGrade($event)" required><option>A</option><option>B</option><option>C</option></select></label>
              <div class="stock-status" [class.out-of-stock]="remainingAvailable() === 0">
                <span>Available stock</span><strong>{{ remainingAvailable() }} pieces</strong>
              </div>
              <label>Number of pieces<input name="pieces" type="number" min="1" step="1" [max]="remainingAvailable()" [value]="editingItem()?.pieces ?? ''" required></label>
              <label>Total weight (kg)<input name="weight" type="number" min=".001" step=".001" [value]="editingItem()?.weight ?? ''" required></label>
              @if (itemError()) { <p class="item-error" role="alert">{{ itemError() }}</p> }
              <button type="submit">{{ editingItem() ? 'Save Changes' : 'Add Item' }}</button>
            </form>
          </div>
        }
        }

        @if (mode === 'prices') {
        <article class="card panel prices">
          <div class="section-heading"><h2>Active Prices</h2><span>per kg</span></div>
          <div class="price-grid">@for (price of prices(); track price.id) {
            <div><strong>Grade {{ price.grade }}{{ price.size ? ' · ' + format(price.size) : '' }}</strong><span>{{ price.pricePerKilogram | currency:'PHP':'symbol-narrow' }}</span></div>
          }</div>
          @if (isOwner()) {
            <form class="price-form" (submit)="savePrice($event)">
              <select name="grade" (change)="priceGrade.set(value($event))"><option>A</option><option>B</option><option>C</option></select>
              @if (priceGrade() !== 'C') {
                <select name="size"><option value="EXTRA_SMALL">Extra-Small</option><option value="SMALL">Small</option><option value="MEDIUM">Medium</option><option value="LARGE">Large</option><option value="JUMBO">Jumbo</option></select>
              }
              <input name="price" type="number" min=".01" step=".01" required placeholder="New price">
              <button type="submit">Update price</button>
            </form>
          }
        </article>
        }

        @if (mode === 'history') {
        <div class="section-heading history"><h2>Sales History</h2><span>Newest first</span></div>
        <div class="history-actions">
          <a class="primary-link" routerLink="/sales/new">+ New Sale</a>
          @if (isOwner()) { <a class="analytics-link" routerLink="/analytics">Open Analytics & Reports →</a> }
        </div>
        <div class="history-filters">
          <input type="search" placeholder="Search sale or customer" (input)="search.set(inputValue($event))">
          <select (change)="statusFilter.set(value($event))"><option>ALL</option><option>DRAFT</option><option>COMPLETED</option><option>CANCELLED</option></select>
        </div>
        <div class="record-list">@for (sale of filteredSales(); track sale.id) {
          <article class="card record sale-record"><a class="sale-link" [routerLink]="['/sales', sale.id]"><span class="record-icon">₱</span><div><strong>Sale #{{ sale.id }} · {{ sale.customerName }}</strong><small>{{ sale.status }} · {{ sale.totalPieces }} pieces · {{ sale.transactionDate | date:'mediumDate' }}</small></div><strong class="sale-total">{{ sale.totalAmount | currency:'PHP':'symbol-narrow' }}</strong></a>
            @if (isOwner() && sale.status !== 'CANCELLED') { <button class="cancel-sale" type="button" (click)="cancel(sale)">Cancel</button> }
          </article>
        } @empty { <article class="card empty">No sales recorded.</article> }</div>
        }
      </div>
    </section>
  `,
  styles: `
    .panel { padding: 18px; margin-bottom: 14px; } fieldset { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; margin: 15px 0 0; padding: 0; border: 0; }
    .sales-nav { position:relative;z-index:1;display:flex;gap:8px;margin-top:18px;overflow-x:auto; }
    .sales-nav a { flex:none;padding:8px 13px;border-radius:999px;color:white;background:rgb(255 255 255 / 12%);text-decoration:none;font-size:12px;font-weight:700; }
    .sales-nav a.active { color:var(--magenta);background:white; }
    legend { font-weight: 800; margin-bottom: 5px; } input, select { min-width: 0; padding: 11px; border: 1px solid var(--line); border-radius: 10px; font: inherit; }
    form button { padding: 12px; border: 0; border-radius: 10px; color: white; background: var(--magenta); font-weight: 800; }
    .sale-form > button { margin-top: 10px; } .message { color: var(--magenta); text-align: center; }
    .secondary { color: var(--magenta); background: var(--magenta-soft); }
    .order-items { margin-top: 18px; }
    .order-item { display: grid; grid-template-columns: auto minmax(0,1fr) auto auto; gap: 12px; align-items: center; margin-top: 9px; padding: 13px; border: 1px solid var(--line); border-radius: 12px; }
    .order-item > div:nth-child(2) { display: grid; gap: 3px; }.order-item small { color: var(--muted); }
    .item-grade { padding: 6px 9px; border-radius: 999px; color: var(--magenta); background: var(--magenta-soft); font-size: 11px; font-weight: 800; }
    .item-actions { display: flex; gap: 6px; }.item-actions button { padding: 7px 9px; color: var(--magenta); background: var(--magenta-soft); font-size: 11px; }.item-actions .remove-item { color: var(--red); background: var(--red-soft); }
    .empty-items { padding: 22px; border: 1px dashed var(--line); border-radius: 12px; color: var(--muted); text-align: center; }
    .add-item { width: 100%; margin-top: 10px; }
    .item-modal-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 20px; background: rgb(20 17 19 / 60%); }
    .item-modal { width: min(100%, 520px); display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 22px; }
    .item-modal .section-heading, .item-modal > button { grid-column: 1 / -1; }.item-modal label { display: grid; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 700; }
    .stock-status { grid-column: 1 / -1; display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 10px; color: var(--green); background: var(--green-soft); font-size: 12px; }.stock-status.out-of-stock { color: var(--red); background: var(--red-soft); }
    .item-error { grid-column: 1 / -1; margin: 0; padding: 9px 11px; border-radius: 9px; color: var(--red); background: var(--red-soft); font-size: 12px; }
    .modal-close { padding: 0; color: var(--muted); background: transparent; font-size: 24px; }
    .payment-summary { margin-top: 14px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--background); }
    .payment-summary div { display: flex; justify-content: space-between; padding: 5px 0; }
    .payment-summary .due { color: var(--red); } .payment-summary .change { color: var(--green); }
    .submit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 14px; }
    .cancel-sale {
      min-width: 76px;
      padding: 9px 13px;
      border: 1px solid rgb(228 78 78 / 25%);
      border-radius: 10px;
      color: var(--red);
      background: var(--red-soft);
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: background .15s ease, transform .15s ease;
    }
    .cancel-sale:hover { background: #fbd6d6; }
    .cancel-sale:active { transform: translateY(1px); }
    .cancel-sale:focus-visible { outline: 3px solid rgb(228 78 78 / 20%); outline-offset: 2px; }
    .price-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
    .price-grid div { display: flex; justify-content: space-between; padding: 9px; border-radius: 9px; background: var(--background); font-size: 12px; }
    .price-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; margin-top: 14px; }
    .history { margin-top: 20px; } .empty { padding: 22px; color: var(--muted); text-align: center; }
    .history-filters { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 10px; }
    .history-actions { display:flex;justify-content:space-between;gap:10px;margin:0 0 14px; }
    .analytics-link,.primary-link { display:inline-block;color:var(--magenta);font-weight:800;text-decoration:none; }
    .primary-link { padding:9px 13px;border-radius:10px;color:white;background:var(--magenta); }
    .sale-record { grid-template-columns: auto minmax(0, 1fr) auto auto; }
    .sale-link { display: contents; color: inherit; text-decoration: none; }
    .sale-link:focus-visible { outline: 3px solid var(--magenta-soft); outline-offset: 3px; }
    .sale-total { white-space: nowrap; }
    @media (max-width: 520px) {
      fieldset, .price-grid { grid-template-columns: 1fr; }
      .price-form { grid-template-columns: 1fr 1fr; }
      .sale-record { grid-template-columns: auto minmax(0, 1fr) auto; }
      .sale-record .cancel-sale { grid-column: 2 / -1; justify-self: end; }
      .order-item { grid-template-columns: auto 1fr auto; }.item-actions { grid-column: 2 / -1; justify-self: end; }.item-modal { grid-template-columns: 1fr; }.item-modal .section-heading, .item-modal > button { grid-column: auto; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesComponent {
  private readonly api = inject(SalesApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  protected readonly mode = this.route.snapshot.data['salesMode'] as 'history' | 'checkout' | 'prices';
  protected readonly pageTitle = this.mode === 'checkout'
    ? 'New Sale'
    : this.mode === 'prices'
      ? 'Price Management'
      : 'Sales History';
  protected readonly prices = signal<FruitPrice[]>([]);
  protected readonly sales = signal<SaleSummary[]>([]);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly paymentMethod = signal('CASH');
  protected readonly grandTotal = signal(0);
  protected readonly amountPaid = signal(0);
  protected readonly balanceDue = signal(0);
  protected readonly changeDue = signal(0);
  protected readonly priceGrade = signal('A');
  protected readonly orderItems = signal<OrderItem[]>([]);
  protected readonly itemModalOpen = signal(false);
  protected readonly editingItem = signal<OrderItem | null>(null);
  protected readonly inventoryLots = signal<InventoryLot[]>([]);
  protected readonly itemSize = signal<OrderItem['size']>('MEDIUM');
  protected readonly itemGrade = signal<OrderItem['grade']>('A');
  protected readonly itemError = signal('');
  protected readonly remainingAvailable = computed(() => {
    const size = this.itemSize();
    const grade = this.itemGrade();
    const stock = this.inventoryLots()
      .filter((lot) => lot.size === size && lot.grade === grade)
      .reduce((total, lot) => total + lot.availablePieces, 0);
    const editingId = this.editingItem()?.id;
    const reserved = this.orderItems()
      .filter((item) => item.id !== editingId && item.size === size && item.grade === grade)
      .reduce((total, item) => total + item.pieces, 0);
    return Math.max(0, stock - reserved);
  });
  protected readonly search = signal('');
  protected readonly statusFilter = signal('ALL');
  protected readonly filteredSales = () => this.sales().filter((sale) => {
    const text = this.search().trim().toLowerCase();
    return (this.statusFilter() === 'ALL' || sale.status === this.statusFilter())
      && (!text || `${sale.id} ${sale.customerName}`.toLowerCase().includes(text));
  });
  private nextLineId = 1;
  protected readonly isOwner = () => this.auth.user()?.role === 'OWNER_ADMIN';

  constructor() { this.load(); }
  protected value(event: Event): string { return (event.target as HTMLSelectElement).value; }
  protected inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }
  protected format(value: string): string { return value.replace('_', '-'); }
  protected openItem(item?: OrderItem): void {
    this.editingItem.set(item ?? null);
    this.itemSize.set(item?.size ?? 'MEDIUM');
    this.itemGrade.set(item?.grade ?? 'A');
    this.itemError.set('');
    this.itemModalOpen.set(true);
  }
  protected closeItem(): void {
    this.itemModalOpen.set(false);
    this.editingItem.set(null);
  }
  protected changeItemSize(event: Event): void {
    this.itemSize.set(this.value(event) as OrderItem['size']);
    this.itemError.set('');
  }
  protected changeItemGrade(event: Event): void {
    this.itemGrade.set(this.value(event) as OrderItem['grade']);
    this.itemError.set('');
  }
  protected saveItem(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const size = String(data.get('size')) as OrderItem['size'];
    const grade = String(data.get('grade')) as OrderItem['grade'];
    const pieces = Number(data.get('pieces'));
    const weight = Number(data.get('weight'));
    const allowedPieces = this.remainingAvailable();
    if (allowedPieces === 0) {
      this.itemError.set(`No ${this.format(size)}, Grade ${grade} stock is available.`);
      return;
    }
    if (pieces > allowedPieces) {
      this.itemError.set(`Only ${allowedPieces} pieces are available for ${this.format(size)}, Grade ${grade}.`);
      return;
    }
    const price = this.prices().find((item) =>
      item.grade === grade && (grade === 'C' || item.size === size),
    )?.pricePerKilogram ?? 0;
    const existing = this.editingItem();
    const item: OrderItem = {
      id: existing?.id ?? this.nextLineId++,
      size, grade, pieces, weight, price, subtotal: price * weight,
    };
    this.orderItems.update((items) => existing
      ? items.map((current) => current.id === existing.id ? item : current)
      : [...items, item]);
    this.closeItem();
    this.updateTotals();
  }
  protected removeItem(id: number): void {
    this.orderItems.update((items) => items.filter((item) => item.id !== id));
    this.updateTotals();
  }
  protected changePaymentMethod(event: Event, form: HTMLFormElement): void {
    this.paymentMethod.set(this.value(event));
    queueMicrotask(() => this.recalculate(form));
  }
  protected recalculate(form: HTMLFormElement): void {
    const data = new FormData(form);
    const paid = Number(data.get('amountPaid')) || 0;
    this.amountPaid.set(paid);
    this.updateTotals();
  }

  protected complete(event: SubmitEvent): void {
    const form = event.currentTarget as HTMLFormElement; event.preventDefault();
    if (!form.reportValidity()) return;
    if (!this.orderItems().length) { this.message.set('Add at least one fruit item.'); return; }
    const command = this.command(form, true);
    if (!command) return;
    this.saving.set(true); this.message.set('');
    this.api.complete(command).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: ({ data: sale }) => { this.message.set(`Sale #${sale.id} completed. Total: ₱${sale.totalAmount}`); this.reset(form); },
      error: (error: unknown) => this.message.set(error instanceof HttpErrorResponse ? error.error?.error?.message ?? 'Sale failed.' : 'Sale failed.'),
    });
  }
  protected saveDraft(form: HTMLFormElement): void {
    if (!form.reportValidity()) return;
    if (!this.orderItems().length) { this.message.set('Add at least one fruit item.'); return; }
    const command = this.command(form, false);
    if (!command) return;
    this.saving.set(true); this.message.set('');
    this.api.createDraft({ customer: command.customer, items: command.items })
      .pipe(finalize(() => this.saving.set(false))).subscribe({
        next: ({ data }) => { this.message.set(`Draft sale #${data.id} saved.`); this.reset(form); },
        error: (error: unknown) => this.message.set(error instanceof HttpErrorResponse ? error.error?.error?.message ?? 'Draft failed.' : 'Draft failed.'),
      });
  }
  protected cancel(sale: SaleSummary): void {
    const reason = window.prompt('Reason for cancelling this sale:')?.trim();
    if (!reason) return;
    const refundConfirmed = sale.status !== 'COMPLETED' || window.confirm('Confirm that the completed payment has been refunded.');
    if (!refundConfirmed) return;
    this.api.cancel(sale.id, reason, sale.status === 'COMPLETED').subscribe({
      next: () => { this.message.set(`Sale #${sale.id} cancelled.`); this.load(); },
      error: (error: unknown) => this.message.set(error instanceof HttpErrorResponse ? error.error?.error?.message ?? 'Cancellation failed.' : 'Cancellation failed.'),
    });
  }
  private command(form: HTMLFormElement, includePayment: boolean): any {
    const data = new FormData(form);
    const base = {
      customer: { name: data.get('name'), address: data.get('address'), contactNumber: data.get('contactNumber'), emailAddress: data.get('emailAddress') },
      items: this.orderItems().map((item) => ({
        size: item.size, grade: item.grade, pieces: item.pieces,
        totalWeightKilograms: item.weight.toFixed(3),
      })),
    };
    return includePayment ? { ...base, payment: { method: data.get('method'), amountPaid: Number(data.get('amountPaid')).toFixed(2), ...(data.get('reference') ? { reference: data.get('reference') } : {}), ...(data.get('provider') ? { otherEWalletProvider: data.get('provider') } : {}) } } : base;
  }
  protected savePrice(event: SubmitEvent): void {
    const form = event.currentTarget as HTMLFormElement; event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form); const grade = String(data.get('grade')) as 'A' | 'B' | 'C';
    this.api.configurePrice({ grade, size: grade === 'C' ? null : String(data.get('size')) as FruitPrice['size'], pricePerKilogram: Number(data.get('price')) }).subscribe({
      next: () => { this.message.set('Price updated.'); form.reset(); this.priceGrade.set('A'); this.load(); },
      error: () => this.message.set('Price could not be updated.'),
    });
  }
  private load(): void {
    if (this.mode === 'checkout' || this.mode === 'prices') {
      this.api.prices().subscribe({
        next: ({ data }) => this.prices.set(data),
        error: () => this.message.set('Prices could not be loaded.'),
      });
    }
    if (this.mode === 'checkout') {
      this.inventoryApi.list().subscribe({
        next: ({ data }) => this.inventoryLots.set(data),
        error: () => this.message.set('Available inventory could not be loaded.'),
      });
    }
    if (this.mode === 'history') {
      this.api.history().subscribe({
        next: ({ data }) => this.sales.set(data),
        error: () => this.message.set('Sales history could not be loaded.'),
      });
    }
  }
  private reset(form: HTMLFormElement): void {
    form.reset(); this.paymentMethod.set('CASH'); this.orderItems.set([]); this.grandTotal.set(0);
    this.amountPaid.set(0); this.balanceDue.set(0); this.changeDue.set(0); this.load();
  }
  private updateTotals(): void {
    const total = this.orderItems().reduce((sum, item) => sum + item.subtotal, 0);
    const paid = this.amountPaid();
    this.grandTotal.set(total);
    this.balanceDue.set(Math.max(0, total - paid));
    this.changeDue.set(this.paymentMethod() === 'CASH' ? Math.max(0, paid - total) : 0);
  }
}
