import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getProfile(idDriver: number): Observable<any> {
    return this.http.get<any>(`${this.base}/api/drivers/${idDriver}`);
  }

  createProfile(body: any): Observable<any> {
    return this.http.post<any>(`${this.base}/api/drivers`, body);
  }

  updateProfile(idDriver: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.base}/api/drivers/${idDriver}`, body);
  }
}
