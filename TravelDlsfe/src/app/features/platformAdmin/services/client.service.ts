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
    return this.http.post<Client>(`${this.base}/api/clients`, data);
  }

  update(id: number, data: UpdateClientDto): Observable<Client> {
    return this.http.put<Client>(`${this.base}/api/clients/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/clients/${id}`);
  }
}
