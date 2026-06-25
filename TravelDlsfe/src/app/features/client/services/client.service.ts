import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import {
  ClientProfile,
  ClientOrder,
  OrderDetail,
  OrderPaginator,
  CompanyPaginator,
  Payment,
  PaymentPaginator,
  SimulatePaymentPayload,
} from '../interface/client.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getProfile(idClient: number): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.base}/api/clients/${idClient}`);
  }

  createProfile(body: any): Observable<ClientProfile> {
    const fd = new FormData();
    if (body.userId) fd.append('userId', String(body.userId));
    if (body.companyName) fd.append('companyName', body.companyName);
    if (body.ruc) fd.append('ruc', body.ruc);
    if (body.address) fd.append('address', body.address);
    if (body.typeClient) fd.append('typeClient', body.typeClient);
    if (body.photo) fd.append('photo', body.photo, body.photo.name);
    return this.http.post<ClientProfile>(`${this.base}/api/clients`, fd);
  }

  updateProfile(idClient: number, body: any): Observable<ClientProfile> {
    const fd = new FormData();
    if (body.userId) fd.append('userId', String(body.userId));
    if (body.companyName) fd.append('companyName', body.companyName);
    if (body.ruc) fd.append('ruc', body.ruc);
    if (body.address) fd.append('address', body.address);
    if (body.typeClient) fd.append('typeClient', body.typeClient);
    if (body.photo) fd.append('photo', body.photo, body.photo.name);
    return this.http.put<ClientProfile>(`${this.base}/api/clients/${idClient}`, fd);
  }

  getOrders(params: {
    idClient?: number;
    page?: number;
    perPage?: number;
  }): Observable<OrderPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    if (params.idClient) p = p.set('idClient', params.idClient);
    return this.http.get<OrderPaginator>(`${this.base}/api/orders`, { params: p });
  }

  getOrderById(id: number): Observable<ClientOrder> {
    return this.http.get<ClientOrder>(`${this.base}/api/orders/${id}`);
  }

  getCompanies(params: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Observable<CompanyPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 50);
    if (params.search) p = p.set('search', params.search);
    return this.http.get<CompanyPaginator>(`${this.base}/api/companies`, { params: p });
  }

  createOrder(body: {
    idClient: number;
    idCompany: number;
    status?: string;
  }): Observable<ClientOrder> {
    return this.http.post<ClientOrder>(`${this.base}/api/orders`, body);
  }

  /** Crea un detalle de carga para una orden existente */
  createOrderDetail(body: {
    idOrder: number;
    cargoDescription: string;
    amount: number;
    unitWeight: string;
    deliveryAddress: string;
    typePackaging: string;
  }): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(`${this.base}/api/order-details`, body);
  }

  respondPrice(idOrder: number, body: { accepted: boolean }): Observable<ClientOrder> {
    return this.http.patch<ClientOrder>(`${this.base}/api/orders/${idOrder}/respond-price`, body);
  }
  simulateOrderPayment(idOrder: number, body: SimulatePaymentPayload): Observable<ClientOrder> {
    return this.http.post<ClientOrder>(`${this.base}/api/orders/${idOrder}/payments/simulate`, body);
  }

  getPayments(params: {
    page?: number;
    perPage?: number;
    status?: string;
    summaryStatus?: string;
    method?: string;
    search?: string;
  }): Observable<PaymentPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    if (params.status) p = p.set('status', params.status);
    if (params.summaryStatus) p = p.set('summaryStatus', params.summaryStatus);
    if (params.method) p = p.set('method', params.method);
    if (params.search) p = p.set('search', params.search);
    return this.http.get<PaymentPaginator>(`${this.base}/api/payments`, { params: p });
  }

  cancelPayment(idPayment: number, reason: string): Observable<Payment> {
    return this.http.patch<Payment>(`${this.base}/api/payments/${idPayment}/cancel`, { reason });
  }
  getOrderPayment(idOrder: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/api/orders/${idOrder}/payment`);
  }
}