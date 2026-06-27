import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

export interface AssignedTruck {
  idTruck: number;
  idCompany: number;
  idDriver: number;
  idCategory: number | null;
  chassis: string;
  plate: string;
  status?: string;
  company?: { idCompany: number; businessName: string };
  driver?: { idDriver: number; user?: { name: string } };
  category?: { idCategory: number; nameCategory: string };
}

export type DriverOperationalStatus = 'available' | 'ontrip' | 'offline' | 'inactive';

export interface DriverProfile {
  idDriver: number;
  idUser?: number;
  idCompany: number;
  license: string;
  passport: string;
  photoUrl: string | null;
  status: DriverOperationalStatus | string;
  company?: { idCompany: number; businessName: string };
  user?: {
    idUser?: number;
    name: string;
    email: string;
    phone?: string;
  };
}

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

  getProfile(idDriver: number): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${this.base}/api/drivers/${idDriver}`);
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

  getAssignedTruck(): Observable<AssignedTruck> {
    return this.http.get<AssignedTruck>(`${this.base}/api/driver/truck`);
  }

  reportTruckMaintenance(): Observable<AssignedTruck> {
    return this.http.patch<AssignedTruck>(`${this.base}/api/driver/truck/status`, { status: 'mantenimiento' });
  }
}
