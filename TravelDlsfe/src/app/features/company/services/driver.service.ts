import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

/** Rol Conductor en BD (role_id = 1) */
export const DRIVER_ROLE_ID = 1 as const;

export interface DriverUser {
  name: string;
  email: string;
}

export interface Driver {
  idDriver: number;
  license: string;
  passport: string;
  status: string;
  photoUrl: string | null;
  deletedAt: string | null;
  user?: DriverUser;
  /** Nombre operativo guardado en cliente cuando aún no hay user vinculado */
  name?: string;
}

export interface UnassignedDriver {
  idDriver: number;
  license: string;
  passport: string;
  status: string;
  photoUrl: string | null;
  deletedAt: string | null;
  idCompany?: number;
  /** Nombre del Paso 1 (localStorage + merge en UI) */
  name?: string;
}

export interface PaginatedDriversResponse {
  data: Driver[];
  meta: {
    total: number;
    lastPage: number;
    currentPage?: number;
    perPage?: number;
  };
}

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: number;
}

export interface RegisterUserResponse {
  message: string;
  token?: string;
  user: {
    idUser: number;
    name: string;
    email: string;
    roleId: number;
  };
}

export interface CreateDriverPayload {
  idCompany: number;
  license: string;
  passport: string;
}

export interface UpdateDriverPayload {
  license?: string;
  passport?: string;
  userId?: number;
  idCompany?: number;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CompanyDriverService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getDrivers(params: HttpParams): Observable<PaginatedDriversResponse> {
    return this.http.get<PaginatedDriversResponse>(`${this.base}/api/drivers`, { params });
  }

  getDriversWithoutUser(idCompany: number): Observable<UnassignedDriver[]> {
    const params = new HttpParams().set('idCompany', idCompany.toString());
    return this.http.get<UnassignedDriver[]>(`${this.base}/api/users/drivers-without-user`, {
      params,
    });
  }

  registerUser(payload: RegisterUserPayload): Observable<RegisterUserResponse> {
    return this.http.post<RegisterUserResponse>(`${this.base}/api/register`, payload);
  }

  createDriver(data: CreateDriverPayload): Observable<Driver> {
    return this.http.post<Driver>(`${this.base}/api/drivers`, data);
  }

  updateDriver(id: number, data: UpdateDriverPayload): Observable<Driver> {
    return this.http.put<Driver>(`${this.base}/api/drivers/${id}`, data);
  }

  deleteDriver(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/api/drivers/${id}`);
  }
}
