import { Routes } from '@angular/router';
import { CompanyShellComponent } from '../components/company-shell/company-shell.component';

export const companyRoutes: Routes = [
  {
    path: '',
    component: CompanyShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../components/dashboard/company-dashboard.component').then(
            (m) => m.CompanyDashboardComponent
          ),
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('../components/drivers/drivers-list.component').then(
            (m) => m.DriversListComponent
          ),
      },
      {
        path: 'trucks',
        loadComponent: () =>
          import('../components/trucks/trucks-list.component').then(
            (m) => m.TrucksListComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('../components/orders/orders-list.component').then(
            (m) => m.OrdersListComponent
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('../components/payments/payments-list.component').then(
            (m) => m.PaymentsListComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../components/profile/company-profile.component').then(
            (m) => m.CompanyProfileComponent
          ),
      },
    ],
  },
];
