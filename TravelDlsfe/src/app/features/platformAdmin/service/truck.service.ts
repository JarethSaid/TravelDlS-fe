import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import {
  Truck,
  TruckPaginator,
  CreateTruckDto,
  UpdateTruckDto,
} from '../interface/truck.interface';

@Injectable({ providedIn: 'root' })
export class TruckService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(params: {
    page?: number;
    perPage?: number;
    idCompany?: number;
  }): Observable<TruckPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    if (params.idCompany) p = p.set('idCompany', params.idCompany);
    return this.http.get<TruckPaginator>(`${this.base}/api/trucks`, { params: p });
  }

  getById(id: number): Observable<Truck> {
    return this.http.get<Truck>(`${this.base}/api/trucks/${id}`);
  }

  create(data: CreateTruckDto): Observable<Truck> {
    return this.http.post<Truck>(`${this.base}/api/trucks`, data);
  }

  update(id: number, data: UpdateTruckDto): Observable<Truck> {
    return this.http.put<Truck>(`${this.base}/api/trucks/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/trucks/${id}`);
  }
}
