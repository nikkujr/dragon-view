import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
interface Data<T>{data:T}
export interface PlantingGroup {
  id:number;recordNumber:string;graftingDate:string;variety:string;location:string;numberOfPlants:number;
  elapsedDays:number;remainingDays:number;stage:'NEWLY_GRAFTED'|'INTERMEDIATE'|'NEAR_MATURITY';
  readyForHarvest:boolean;estimatedMaturityDate:string;progressPercent:number;
}
export interface PlantingDetails extends PlantingGroup {
  monitoring:Array<{id:number;notes:string;recordedAt:string;recordedBy:string}>;
}
@Injectable({providedIn:'root'})
export class PlantingApiService {
  private readonly http=inject(HttpClient);
  list(){return this.http.get<Data<PlantingGroup[]>>('/api/planting')}
  create(command:unknown){return this.http.post<Data<PlantingGroup>>('/api/planting',command)}
  details(id:number){return this.http.get<Data<PlantingDetails>>(`/api/planting/${id}`)}
  update(id:number,command:unknown){return this.http.put<Data<PlantingGroup>>(`/api/planting/${id}`,command)}
  remove(id:number,reason:string){return this.http.delete<Data<{deleted:boolean}>>(`/api/planting/${id}`,{body:{reason}})}
  monitor(id:number,notes:string){return this.http.post<Data<{id:number}>>(`/api/planting/${id}/monitoring`,{notes})}
}
