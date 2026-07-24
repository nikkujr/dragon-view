import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { InventoryLot } from './inventory-api.service';

interface DataResponse<T> { data: T }
export interface FruitPrice {
  id: number; grade: 'A' | 'B' | 'C'; size: InventoryLot['size'] | null; pricePerKilogram: number;
}
export interface SaleSummary {
  id: number; customerName: string; status: string; paymentStatus: string;
  paymentMethod: string; totalAmount: number; totalPieces: number; transactionDate: string;
}
export interface SaleDetails {
  id: number; status: string; paymentStatus: string; paymentMethod: string | null;
  amountPaid: number | null; totalAmount: number; changeDue: number;
  paymentReference: string | null; createdAt: string;
  customer: { name: string; address: string; contactNumber: string; emailAddress: string };
  items: Array<{
    id: number; size: InventoryLot['size']; grade: 'A' | 'B' | 'C'; pieces: number;
    totalWeightKilograms: number; pricePerKilogram: number; subtotal: number;
    allocations: Array<{ inventoryId: number; batchNumber: string; pieces: number }>;
  }>;
}
export interface SalesAnalytics {
  period: string; selectedDate: string; previousRevenue: number; comparisonPercent: number | null;
  totals: { revenue: number; completedSales: number; pieces: number; weightKilograms: number };
  trend: Array<{ label: string; revenue: number; pieces: number }>;
  summary: Array<{ size: string; grade: string; pieces: number; weightKilograms: number; revenue: number }>;
}

@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private readonly http = inject(HttpClient);
  prices() { return this.http.get<DataResponse<FruitPrice[]>>('/api/sales/prices'); }
  history() { return this.http.get<DataResponse<SaleSummary[]>>('/api/sales'); }
  configurePrice(price: Omit<FruitPrice, 'id'>) {
    return this.http.post<DataResponse<FruitPrice>>('/api/sales/prices', price);
  }
  complete(command: unknown) {
    return this.http.post<DataResponse<{ id: number; totalAmount: string; totalPieces: number }>>(
      '/api/sales/complete', command,
    );
  }
  createDraft(command: unknown) {
    return this.http.post<DataResponse<{ id: number; totalAmount: string; status: 'DRAFT' }>>(
      '/api/sales/drafts', command,
    );
  }
  cancel(id: number, reason: string, refundConfirmed: boolean) {
    return this.http.post<DataResponse<{ id: number; status: 'CANCELLED' }>>(
      `/api/sales/${id}/cancel`, { reason, refundConfirmed },
    );
  }
  details(id: number) { return this.http.get<DataResponse<SaleDetails>>(`/api/sales/${id}`); }
  updateDraft(id: number, command: unknown) {
    return this.http.put<DataResponse<{ id: number; totalAmount: string }>>(`/api/sales/${id}`, command);
  }
  completeDraft(id: number, payment: unknown) {
    return this.http.post<DataResponse<{ id: number; totalAmount: string; changeDue: string }>>(
      `/api/sales/${id}/complete`, payment,
    );
  }
  analytics(period: string, date: string) {
    return this.http.get<DataResponse<SalesAnalytics>>('/api/sales/analytics', {
      params: { period, date },
    });
  }
}
