import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import {
  Category,
  CategoryPaginator,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../interface/category.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(params: { page?: number; perPage?: number }): Observable<CategoryPaginator> {
    const p = new HttpParams()
      .set('page', params.page ?? 1)
      .set('perPage', params.perPage ?? 10);
    return this.http.get<CategoryPaginator>(`${this.base}/api/categories`, { params: p });
  }

  getById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.base}/api/categories/${id}`);
  }

  create(data: CreateCategoryDto): Observable<Category> {
    return this.http.post<Category>(`${this.base}/api/categories`, data);
  }

  update(id: number, data: UpdateCategoryDto): Observable<Category> {
    return this.http.put<Category>(`${this.base}/api/categories/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/categories/${id}`);
  }
}
