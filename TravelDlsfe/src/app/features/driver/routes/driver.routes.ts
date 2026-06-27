import { Routes } from '@angular/router';
import { DriverShellComponent } from '../components/driver-shell/driver-shell.component';

export const driverRoutes: Routes = [
  {
    path: '',
    component: DriverShellComponent,
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
            (m) => m.DriverDashboardComponent,
          ),
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('../components/trips/driver-trips.component').then(
            (m) => m.DriverTripsComponent,
          ),
      },
      {
        path: 'truck',
        loadComponent: () =>
          import('../components/truck/driver-truck.component').then(
            (m) => m.DriverTruckComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../components/profile/driver-profile.component').then(
            (m) => m.DriverProfileComponent,
          ),
      },
    ],
  },
];
