import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

export interface DriverProfilePayload {
  userId: number;
  license: string;
  passport: string;
  status: string;
  photo?: File | null;
}

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getProfile(idDriver: number): Observable<any> {
    return this.http.get<any>(`${this.base}/api/drivers/${idDriver}`);
  }

  createProfile(payload: DriverProfilePayload): Observable<any> {
    const fd = new FormData();
    fd.append('userId', String(payload.userId));
    fd.append('license', payload.license);
    fd.append('passport', payload.passport);
    fd.append('status', payload.status);
    if (payload.photo) {
      fd.append('photo', payload.photo, payload.photo.name);
    }
    return this.http.post<any>(`${this.base}/api/drivers`, fd);
  }

  updateProfile(idDriver: number, payload: DriverProfilePayload): Observable<any> {
    const fd = new FormData();
    fd.append('userId', String(payload.userId));
    fd.append('license', payload.license);
    fd.append('passport', payload.passport);
    fd.append('status', payload.status);
    if (payload.photo) {
      fd.append('photo', payload.photo, payload.photo.name);
    }
    return this.http.put<any>(`${this.base}/api/drivers/${idDriver}`, fd);
  }
}
