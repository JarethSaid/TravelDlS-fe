import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Si ya hay sesión, manda al panel en lugar de mostrar login/registro. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const getDashboardRoute = (role: string | null | undefined) => {
    if (role === 'platform_admin') return router.createUrlTree(['/admin/dashboard']);
    if (role === 'driver') return router.createUrlTree(['/driver/dashboard']);
    if (role === 'company') return router.createUrlTree(['/company/dashboard']);
    return true; // No route, stay here to prevent loop
  };

  if (auth.user()) {
    return getDashboardRoute(auth.user()?.role);
  }

  try {
    await firstValueFrom(auth.refreshSession());
    if (auth.user()) {
      return getDashboardRoute(auth.user()?.role);
    }
  } catch {
    /* permitir invitado */
  }

  return true;
};
