import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import {
  Company,
  CompanyPaginator,
  CreateCompanyDto,
  UpdateCompanyDto,
} from '../interface/company.interface';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(params: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Observable<CompanyPaginator> {
    let p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    if (params.search) p = p.set('search', params.search);
    return this.http.get<CompanyPaginator>(`${this.base}/api/companies`, { params: p });
  }

  getById(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.base}/api/companies/${id}`);
  }

  create(data: CreateCompanyDto): Observable<Company> {
    return this.http.post<Company>(`${this.base}/api/companies`, data);
  }

  update(id: number, data: UpdateCompanyDto): Observable<Company> {
    return this.http.put<Company>(`${this.base}/api/companies/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/companies/${id}`);
  }
}
