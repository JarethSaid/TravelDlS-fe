import { Routes } from '@angular/router';
import { ClientShellComponent } from '../components/client-shell/client-shell.component';

export const clientRoutes: Routes = [
  {
    path: '',
    component: ClientShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../components/dashboard/client-dashboard.component').then(
            (m) => m.ClientDashboardComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('../components/orders/client-orders.component').then(
            (m) => m.ClientOrdersComponent,
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('../components/payments/client-payments.component').then(
            (m) => m.ClientPaymentsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../components/profile/client-profile.component').then(
            (m) => m.ClientProfileComponent,
          ),
      },
    ],
  },
];
