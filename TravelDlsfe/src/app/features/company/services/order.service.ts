import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getOrders(params?: HttpParams): Observable<any> {
    return this.http.get<any>(`${this.base}/api/orders`, { params });
  }

  assignDriver(idOrder: number, idDriver: number): Observable<any> {
    return this.http.patch<any>(`${this.base}/api/orders/${idOrder}/assign-driver`, { idDriver });
  }
}
