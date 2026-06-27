import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../company/services/order.service';
import { HttpParams } from '@angular/common/http';
import { resolveOrderDeliveryAddress } from '../../../../shared/utils/order-address.util';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [DatePipe],
  template: `
    <div class="dashboard">
      <div class="header-section">
        <h1>Bienvenido, {{ firstName() }} 👋</h1>
        <p class="date">{{ currentDate }}</p>
      </div>

      <div class="stats-grid">
        @for (s of stats(); track s.label) {
          <div class="stat-card">
            <div class="stat-icon" [style.background]="s.bg" [style.color]="s.color">
              <i [class]="s.icon"></i>
            </div>
            <div class="stat-info">
              <p class="stat-value">{{ s.value }}</p>
              <p class="stat-label">{{ s.label }}</p>
            </div>
          </div>
        }
      </div>

      <div class="recent-trips">
        <div class="section-header">
          <h2>Viajes recientes</h2>
          <a [routerLink]="['/driver/trips']" class="view-all">Ver todos ></a>
        </div>

        @if (loadingTrips()) {
          <div class="empty-state">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Cargando viajes…
          </div>
        } @else if (recentTrips().length === 0) {
          <div class="empty-state">
            No hay viajes registrados.
          </div>
        } @else {
          <div class="trips-list">
            @for (trip of recentTrips(); track trip.idOrder) {
              <div class="trip-row">
                <div class="trip-main">
                  <span class="trip-badge">#{{ trip.idOrder }}</span>
                  <div class="trip-details">
                    <p class="trip-client">{{ trip.client?.companyName || trip.client?.user?.name || 'Cliente #' + trip.idClient }}</p>
                    <p class="trip-desc">{{ trip.details?.[0]?.cargoDescription || 'Sin descripción' }}</p>
                  </div>
                </div>
                <div class="trip-dest">
                  <i class="fa-solid fa-location-dot"></i>
                  <span>{{ deliveryAddress(trip) }}</span>
                </div>
                <div class="trip-status">
                  <span class="status-chip status-{{ trip.status }}">
                    {{ statusLabel(trip.status) }}
                  </span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .header-section h1 {
      margin: 0;
      font-size: 24px;
      color: #1e293b;
      font-weight: 700;
    }

    .header-section .date {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }

    .stat-label {
      margin: 2px 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .recent-trips {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      min-height: 250px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }

    .view-all {
      color: #3d39af;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 14px;
      height: 100px;
    }

    .trips-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .trip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
      transition: all 0.2s;
    }

    .trip-row:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .trip-main {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .trip-badge {
      font-size: 12px;
      font-weight: 700;
      color: #3d39af;
      background: #ede9fe;
      padding: 6px 10px;
      border-radius: 8px;
    }

    .trip-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .trip-client {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trip-desc {
      margin: 2px 0 0;
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trip-dest {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #475569;
      flex: 1;
      padding: 0 16px;
      min-width: 0;
    }

    .trip-dest i {
      color: #94a3b8;
      flex-shrink: 0;
    }

    .trip-dest span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trip-status {
      flex-shrink: 0;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .status-pendiente { background: #fef3c7; color: #b45309; }
    .status-confirmado { background: #e0e7ff; color: #3730a3; }
    .status-esperando_aprobacion { background: #e0f2fe; color: #0ea5e9; }
    .status-aceptado { background: #f3e8ff; color: #7c3aed; }
    .status-en_transito { background: #dbeafe; color: #1d4ed8; }
    .status-entregado { background: #dcfce7; color: #166534; }
    .status-cancelado { background: #fee2e2; color: #b91c1c; }
    .status-anulado { background: #fee2e2; color: #b91c1c; }
    .status-denegado { background: #fee2e2; color: #b91c1c; }
  `]
})
export class DriverDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly datePipe = inject(DatePipe);
  private readonly orderService = inject(OrderService);
  readonly deliveryAddress = resolveOrderDeliveryAddress;

  readonly user = this.auth.user;
  readonly firstName = signal<string>('Usuario');
  readonly stats = signal<StatCard[]>([
    { label: 'Total viajes', value: 0, icon: 'fa-solid fa-truck-moving', color: '#6366f1', bg: '#ede9fe' },
    { label: 'Entregados', value: 0, icon: 'fa-regular fa-circle-check', color: '#10b981', bg: '#d1fae5' },
    { label: 'Pendientes', value: 0, icon: 'fa-regular fa-clock', color: '#f59e0b', bg: '#fef3c7' },
  ]);

  currentDate = '';
  readonly recentTrips = signal<any[]>([]);
  readonly loadingTrips = signal<boolean>(true);

  ngOnInit(): void {
    const today = new Date();
    this.currentDate = this.datePipe.transform(today, 'EEEE, d \'de\' MMMM yyyy', '', 'en-US') || '';

    if (this.user() && this.user()?.name) {
      const nameParts = this.user()!.name.split(' ');
      this.firstName.set(nameParts[0]);
    }

    this.loadStats();
  }

  loadStats(): void {
    const user = this.user();
    if (!user || !user.idDriver) {
      this.loadingTrips.set(false);
      return;
    }

    this.loadingTrips.set(true);
    const params = new HttpParams().set('idDriver', user.idDriver).set('perPage', 50);
    this.orderService.getOrders(params).subscribe({
      next: (res) => {
        const orders = res.data || [];
        const total = orders.length;
        const entregados = orders.filter((o: any) => o.status === 'entregado').length;
        const pendientes = orders.filter((o: any) =>
          ['pendiente', 'confirmado', 'esperando_aprobacion', 'aceptado', 'en_transito'].includes(o.status),
        ).length;

        this.stats.set([
          { label: 'Total viajes', value: total, icon: 'fa-solid fa-truck-moving', color: '#6366f1', bg: '#ede9fe' },
          { label: 'Entregados', value: entregados, icon: 'fa-regular fa-circle-check', color: '#10b981', bg: '#d1fae5' },
          { label: 'Pendientes', value: pendientes, icon: 'fa-regular fa-clock', color: '#f59e0b', bg: '#fef3c7' },
        ]);

        this.recentTrips.set(orders.slice(0, 5));
        this.loadingTrips.set(false);
      },
      error: (err) => {
        console.error('Error cargando stats', err);
        this.loadingTrips.set(false);
      }
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      esperando_aprobacion: 'Esperando Aprobación',
      aceptado: 'Aceptado',
      en_transito: 'En tránsito',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      anulado: 'Anulada',
      denegado: 'Denegado',
    };
    return map[status] ?? status;
  }
}

