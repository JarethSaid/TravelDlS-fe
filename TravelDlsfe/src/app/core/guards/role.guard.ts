import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRole: string): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    
    const user = auth.user();
    
    if (user && user.role === allowedRole) {
      return true;
    }
    
    // Si no tiene el rol, redirigir al login
    router.navigate(['/login']);
    return false;
  };
};
