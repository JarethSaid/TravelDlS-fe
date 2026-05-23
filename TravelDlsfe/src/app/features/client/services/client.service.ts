import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import { ClientProfile, ClientOrder, OrderDetail, OrderPaginator, CompanyPaginator } from '../interface/client.interface';

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
    return this.http.post<ClientProfile>(`${this.base}/api/clients`, body);
  }

  updateProfile(idClient: number, body: any): Observable<ClientProfile> {
    return this.http.put<ClientProfile>(`${this.base}/api/clients/${idClient}`, body);
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
}
