import { Routes } from '@angular/router';
import { AdminShellComponent } from '../components/admin-shell/admin-shell.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../components/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('../components/companies/companies-list.component').then(
            (m) => m.CompaniesListComponent
          ),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('../components/clients/clients-list.component').then(
            (m) => m.ClientsListComponent
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
        path: 'categories',
        loadComponent: () =>
          import('../components/categories/categories-list.component').then(
            (m) => m.CategoriesListComponent
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
        path: 'orders',
        loadComponent: () =>
          import('../components/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
    ],
  },
];
