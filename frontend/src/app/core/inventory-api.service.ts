import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface InventoryLot {
  id: number;
  batchNumber: string;
  harvestDate: string;
  size: 'EXTRA_SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'JUMBO';
  grade: 'A' | 'B' | 'C';
  availablePieces: number;
}

interface DataResponse<T> { data: T }
export interface InventoryDetails extends InventoryLot {
  transactions: Array<{
    id: number; type: string; pieces: number; remarks: string | null;
    createdAt: string; createdBy: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);

  list(grade?: string, search?: string) {
    let params = new HttpParams();
    if (grade && grade !== 'All') params = params.set('grade', grade);
    if (search) params = params.set('search', search);
    return this.http.get<DataResponse<InventoryLot[]>>('/api/inventory', { params });
  }

  registerHarvest(command: {
    batchNumber: string;
    harvestDate: string;
    items: Array<{ size: InventoryLot['size']; grade: InventoryLot['grade']; pieces: number }>;
  }) {
    return this.http.post<DataResponse<{ id: number; batchNumber: string }>>(
      '/api/inventory/harvests',
      command,
    );
  }

  details(id: number) {
    return this.http.get<DataResponse<InventoryDetails>>(`/api/inventory/${id}`);
  }

  adjust(id: number, pieces: number, reason: string) {
    return this.http.post<DataResponse<{ availablePieces: number }>>(
      `/api/inventory/${id}/adjustments`, { pieces, reason },
    );
  }

  regrade(id: number, targetGrade: 'B' | 'C', pieces: number, reason: string) {
    return this.http.post<DataResponse<{ targetGrade: 'B' | 'C' }>>(
      `/api/inventory/${id}/regrade`, { targetGrade, pieces, reason },
    );
  }
}
