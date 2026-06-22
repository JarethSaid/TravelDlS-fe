import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

@Injectable({
  providedIn: 'root',
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

  assignPrice(idOrder: number, amount: number): Observable<any> {
    return this.http.patch<any>(`${this.base}/api/orders/${idOrder}/assign-price`, { amount });
  }

  /** Envía las coordenadas actuales del conductor al backend */
  updateOrderLocation(idOrder: number, latitude: number, longitude: number): Observable<any> {
    return this.http.post<any>(`${this.base}/api/orders/${idOrder}/tracking`, { latitude, longitude });
  }

  /** Obtiene la última ubicación registrada del conductor para una orden */
  getOrderLocation(idOrder: number): Observable<any> {
    return this.http.get<any>(`${this.base}/api/orders/${idOrder}/tracking`);
  }

  /** Actualiza el estado de una orden (en_proceso, completado, etc.) */
  updateOrderStatus(idOrder: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.base}/api/orders/${idOrder}`, { status });
  }
  getPayments(params?: HttpParams): Observable<any> {
    return this.http.get<any>(`${this.base}/api/payments`, { params });
  }
}