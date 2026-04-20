import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api-base-url';

/** Envía cookies httpOnly (`auth_token`) en peticiones al mismo origen configurado del API. */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = inject(API_BASE_URL);
  if (req.url.startsWith(apiBase)) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
