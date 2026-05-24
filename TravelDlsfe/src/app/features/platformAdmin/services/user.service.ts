import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';

export interface UserOption {
  idUser: number;
  idDriver: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  registerUser(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/api/register`, payload);
  }

  getUnassignedCompanyUsers(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.base}/api/users/unassigned-company`);
  }

  getUnassignedDriverUsers(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.base}/api/users/unassigned-driver`);
  }

  getUnassignedClientUsers(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.base}/api/users/unassigned-client`);
  }
}
