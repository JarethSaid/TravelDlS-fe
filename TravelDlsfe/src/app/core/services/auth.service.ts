import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap, switchMap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { SessionUser } from '../models/session-user.model';

interface AuthSuccessResponse {
  message: string;
  token?: string;
  user?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE_URL);

  /** Usuario actual (rehidratado con GET /me tras login o signup). */
  readonly user = signal<SessionUser | null>(null);

  login(credentials: { email: string; password: string }): Observable<SessionUser> {
    return this.http
      .post<AuthSuccessResponse>(`${this.apiBase}/api/auth/login`, credentials)
      .pipe(
        switchMap(() => this.http.get<SessionUser>(`${this.apiBase}/api/auth/me`)),
        tap((me) => this.user.set(me)),
      );
  }

  signup(data: { name: string; email: string; password: string }): Observable<SessionUser> {
    return this.http
      .post<AuthSuccessResponse>(`${this.apiBase}/api/auth/signup`, data)
      .pipe(
        switchMap(() => this.http.get<SessionUser>(`${this.apiBase}/api/auth/me`)),
        tap((me) => this.user.set(me)),
      );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.apiBase}/api/auth/logout`, {}).pipe(
      tap({
        next: () => this.user.set(null),
        error: () => this.user.set(null),
      }),
    );
  }

  /** Recupera sesión si la cookie sigue siendo válida. */
  refreshSession(): Observable<SessionUser | null> {
    return this.http.get<SessionUser>(`${this.apiBase}/api/auth/me`).pipe(
      tap({
        next: (me) => this.user.set(me),
        error: () => this.user.set(null),
      }),
    );
  }
}
