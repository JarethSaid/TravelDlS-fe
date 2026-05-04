import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../../../core/api-base-url';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getDashboardStats(): Observable<any> {
    return forkJoin({
      companies: this.http.get<any>(`${this.base}/api/companies?perPage=1`).pipe(catchError(() => of({ meta: { total: 0 } }))),
      clients:   this.http.get<any>(`${this.base}/api/clients?perPage=100`).pipe(catchError(() => of({ data: [], meta: { total: 0 } }))),
      drivers:   this.http.get<any>(`${this.base}/api/drivers?perPage=100`).pipe(catchError(() => of({ data: [], meta: { total: 0 } }))),
    });
  }
}
