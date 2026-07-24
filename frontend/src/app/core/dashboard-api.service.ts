import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
interface Data<T>{data:T}
export interface DashboardData {
 summary:{inventoryPieces:number;activeBatches:number;salesToday:number;monthlyRevenue:number;plantingGroups:number;classificationsToday:number};
 harvestTrend:Array<{date:string;pieces:number}>;
 classificationByGrade:{A:number;B:number;C:number};
 recent:{inventory:any[];sales:any[];planting:any[];classifications:any[]};
}
@Injectable({providedIn:'root'})
export class DashboardApiService {
 private readonly http=inject(HttpClient);
 load(){return this.http.get<Data<DashboardData>>('/api/dashboard')}
}
