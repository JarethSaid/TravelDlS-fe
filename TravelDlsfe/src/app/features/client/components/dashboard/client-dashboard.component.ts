import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../services/client.service';
import { ClientOrder } from '../../interface/client.interface';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [DatePipe],
  template: `
    <div class="dashboard">
      <div class="header-section">
        <h1>Bienvenido, {{ firstName() }} 👋</h1>
        <p class="date">{{ currentDate }}</p>
      </div>

      <!-- Stats grid -->
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

      <!-- Recent Orders -->
      <div class="recent-orders">
        <div class="section-header">
          <h2>Órdenes recientes</h2>
          <a routerLink="/client/orders" class="view-all">Ver todos ></a>
        </div>

        @if (loadingOrders()) {
          <div class="empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>&nbsp; Cargando órdenes…
          </div>
        } @else if (recentOrders().length === 0) {
          <div class="empty-state">
            No hay órdenes registradas.
          </div>
        } @else {
          <div class="orders-table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th># Orden</th>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (order of recentOrders(); track order.idOrder) {
                  <tr>
                    <td class="order-id">#{{ order.idOrder }}</td>
                    <td>{{ order.company?.businessName ?? 'Sin asignar' }}</td>
                    <td>
                      <span class="status-chip" [class]="'status-chip status-' + order.status">
                        {{ statusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="order-date">{{ order.createdAt | date:'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
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

    .recent-orders {
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
      margin-bottom: 20px;
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
      transition: color 0.2s;
    }

    .view-all:hover {
      color: #2d2a8a;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 14px;
      height: 100px;
    }

    /* Orders table */
    .orders-table-wrapper {
      overflow-x: auto;
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .orders-table th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .orders-table td {
      padding: 12px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .orders-table tbody tr {
      transition: background 0.15s;
    }

    .orders-table tbody tr:hover {
      background: #f8fafc;
    }

    .order-id {
      font-weight: 600;
      color: #3d39af;
    }

    .order-date {
      color: #64748b;
      font-size: 13px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-pendiente {
      background: #fef3c7;
      color: #d97706;
    }

    .status-completada {
      background: #dcfce7;
      color: #16a34a;
    }

    .status-cancelada {
      background: #fee2e2;
      color: #dc2626;
    }

    .status-en_proceso {
      background: #dbeafe;
      color: #2563eb;
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly datePipe = inject(DatePipe);

  readonly user = this.auth.user;
  readonly firstName = signal<string>('Usuario');
  readonly loadingOrders = signal(true);
  readonly recentOrders = signal<ClientOrder[]>([]);

  readonly stats = signal<StatCard[]>([
    { label: 'Total órdenes', value: 0, icon: 'fa-solid fa-clipboard-list', color: '#6366f1', bg: '#ede9fe' },
    { label: 'Completadas',   value: 0, icon: 'fa-regular fa-circle-check', color: '#10b981', bg: '#d1fae5' },
    { label: 'Pendientes',    value: 0, icon: 'fa-regular fa-clock',        color: '#f59e0b', bg: '#fef3c7' },
  ]);

  currentDate = '';

  ngOnInit(): void {
    const today = new Date();
    this.currentDate = this.datePipe.transform(today, 'EEEE, d \'de\' MMMM yyyy', '', 'es') || '';

    if (this.user() && this.user()?.name) {
      const nameParts = this.user()!.name.split(' ');
      this.firstName.set(nameParts[0]);
    }

    this.loadOrders();
  }

  private loadOrders(): void {
    const u = this.user();
    if (!u?.idClient) {
      this.loadingOrders.set(false);
      return;
    }

    this.clientService.getOrders({ idClient: u.idClient, perPage: 5 }).subscribe({
      next: (res) => {
        this.recentOrders.set(res.data);

        const total = res.meta.total;
        const completed = res.data.filter(o => o.status === 'completada').length;
        const pending = res.data.filter(o => o.status === 'pendiente').length;

        // Si tenemos acceso a todas las páginas, usamos total del meta
        // De lo contrario contamos lo que tenemos para las cards
        this.stats.set([
          { label: 'Total órdenes', value: total, icon: 'fa-solid fa-clipboard-list', color: '#6366f1', bg: '#ede9fe' },
          { label: 'Completadas',   value: completed, icon: 'fa-regular fa-circle-check', color: '#10b981', bg: '#d1fae5' },
          { label: 'Pendientes',    value: pending, icon: 'fa-regular fa-clock', color: '#f59e0b', bg: '#fef3c7' },
        ]);

        this.loadingOrders.set(false);
      },
      error: () => {
        this.loadingOrders.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      completada: 'Completada',
      cancelada: 'Cancelada',
      en_proceso: 'En proceso',
    };
    return map[status] ?? status;
  }
}
