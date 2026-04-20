import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Redirige a /login si no hay sesión válida (cookie + /me). */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) {
    return true;
  }

  try {
    await firstValueFrom(auth.refreshSession());
    if (auth.user()) {
      return true;
    }
  } catch {
    /* sin sesión */
  }

  return router.createUrlTree(['/login']);
};
