import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRole: string): CanActivateFn => {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const expected = allowedRole.toLowerCase();

    if (!auth.user()) {
      try {
        await firstValueFrom(auth.refreshSession());
      } catch {
        /* sin sesión */
      }
    }

    const role = auth.user()?.role?.toLowerCase();
    if (role === expected) {
      return true;
    }

    return router.createUrlTree(['/login']);
  };
};
