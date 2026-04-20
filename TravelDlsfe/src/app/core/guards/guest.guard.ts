import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Si ya hay sesión, manda al panel en lugar de mostrar login/registro. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) {
    return router.createUrlTree(['/dashboard']);
  }

  try {
    await firstValueFrom(auth.refreshSession());
    if (auth.user()) {
      return router.createUrlTree(['/dashboard']);
    }
  } catch {
    /* permitir invitado */
  }

  return true;
};
