import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/platformAdmin/routes/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard('driver')],
    loadChildren: () =>
      import('./features/driver/routes/driver.routes').then((m) => m.driverRoutes),
  },
  {
    path: 'company',
    canActivate: [authGuard, roleGuard('company')],
    loadChildren: () =>
      import('./features/company/routes/company.routes').then((m) => m.companyRoutes),
  },
  {
    path: 'client',
    canActivate: [authGuard, roleGuard('client')],
    loadChildren: () =>
      import('./features/client/routes/client.routes').then((m) => m.clientRoutes),
  },
  { path: '**', redirectTo: 'login' },
];

