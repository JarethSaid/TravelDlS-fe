import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

export interface DriverUpdatePayload {
  idCompany?: number;
  license?: string;
  passport?: string;
  status?: string;
  photo?: File | null;
}

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getDrivers(params?: HttpParams): Observable<any> {
    return this.http.get<any>(`${this.base}/api/drivers`, { params });
  }

  /** Actualización simple (sin archivo) — usado para vincular empresa */
  updateDriver(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/api/drivers/${id}`, data);
  }

  /**
   * Actualización con soporte de foto.
   * Envía multipart/form-data para que el backend suba la imagen a Cloudinary.
   * AdonisJS v6 acepta PUT + multipart de forma nativa.
   */
  updateDriverWithPhoto(id: number, payload: DriverUpdatePayload): Observable<any> {
    const fd = new FormData();
    if (payload.idCompany !== undefined) fd.append('idCompany', String(payload.idCompany));
    if (payload.license)  fd.append('license',  payload.license);
    if (payload.passport) fd.append('passport', payload.passport);
    if (payload.status)   fd.append('status',   payload.status);
    if (payload.photo)    fd.append('photo',    payload.photo, payload.photo.name);
    return this.http.put<any>(`${this.base}/api/drivers/${id}`, fd);
  }
}
