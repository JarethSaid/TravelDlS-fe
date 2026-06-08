import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import {
  Client,
  ClientPaginator,
  CreateClientDto,
  UpdateClientDto,
} from '../interface/client.interface';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(params: {
    page?: number;
    perPage?: number;
    search?: string;
    typeClient?: string;
  }): Observable<ClientPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    if (params.search) p = p.set('search', params.search);
    if (params.typeClient) p = p.set('typeClient', params.typeClient);
    return this.http.get<ClientPaginator>(`${this.base}/api/clients`, { params: p });
  }

  getById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.base}/api/clients/${id}`);
  }

  create(data: CreateClientDto): Observable<Client> {
    const fd = new FormData();
    fd.append('companyName', data.companyName);
    fd.append('ruc', data.ruc);
    fd.append('address', data.address);
    fd.append('typeClient', data.typeClient);
    if (data.userId) {
      fd.append('userId', String(data.userId));
    }
    if (data.photo) {
      fd.append('photo', data.photo, data.photo.name);
    }
    return this.http.post<Client>(`${this.base}/api/clients`, fd);
  }

  update(id: number, data: UpdateClientDto): Observable<Client> {
    const fd = new FormData();
    if (data.companyName) fd.append('companyName', data.companyName);
    if (data.ruc) fd.append('ruc', data.ruc);
    if (data.address) fd.append('address', data.address);
    if (data.typeClient) fd.append('typeClient', data.typeClient);
    if (data.userId) fd.append('userId', String(data.userId));
    if (data.photo) {
      fd.append('photo', data.photo, data.photo.name);
    }
    return this.http.put<Client>(`${this.base}/api/clients/${id}`, fd);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/clients/${id}`);
  }
}
