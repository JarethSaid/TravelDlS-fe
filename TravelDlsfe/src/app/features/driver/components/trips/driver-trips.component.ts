import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../company/services/order.service';
import { HttpParams } from '@angular/common/http';
import { interval, Subscription, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-driver-trips',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trips-page">
      <div class="page-header">
        <h1>Mis Viajes</h1>
        <p class="subtitle">Gestiona y consulta tus viajes asignados</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button
            class="tab"
            [class.tab--active]="activeFilter() === 'all'"
            (click)="setFilter('all')"
          >Todos</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter() === 'pending'"
            (click)="setFilter('pending')"
          >Pendientes</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter() === 'completed'"
            (click)="setFilter('completed')"
          >Completados</button>
        </div>
      </div>

      @if (loading() && trips().length === 0) {
        <div class="empty-card">
          <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
          <h3>Cargando viajes…</h3>
        </div>
      } @else if (filteredTrips().length === 0) {
        <!-- Empty state -->
        <div class="empty-card">
          <div class="empty-icon">
            <i class="fa-solid fa-route"></i>
          </div>
          <h3>No hay viajes registrados</h3>
          <p>Cuando te asignen viajes, aparecerán aquí para que puedas darles seguimiento.</p>
        </div>
      } @else {
        <div class="table-card">
          <div class="table-wrapper">
            <table class="orders-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; text-align: left; background: #f8fafc;">
                  <th style="padding: 12px 16px; color: #475569; font-size: 13px;"># Viaje</th>
                  <th style="padding: 12px 16px; color: #475569; font-size: 13px;">Cliente</th>
                  <th style="padding: 12px 16px; color: #475569; font-size: 13px;">Carga</th>
                  <th style="padding: 12px 16px; color: #475569; font-size: 13px;">Dirección</th>
                </tr>
              </thead>
              <tbody>
                @for (trip of filteredTrips(); track trip.idOrder) {
                  <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
                    <td style="padding: 16px; font-weight: 600; color: #0f172a;">#{{ trip.idOrder }}</td>
                    <td style="padding: 16px;">
                      <div style="color: #334155; font-weight: 500;">{{ trip.client?.companyName || trip.client?.user?.name || 'Cliente #' + trip.idClient }}</div>
                    </td>
                    <td style="padding: 16px;">
                      <div style="font-size: 13px; color: #334155; font-weight: 500;">{{ trip.details?.[0]?.cargoDescription || 'Sin descripción' }}</div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                        @if (trip.details?.[0]) {
                          {{ trip.details[0].amount }}x {{ trip.details[0].typePackaging }} ({{ trip.details[0].unitWeight }})
                        }
                      </div>
                    </td>
                    <td style="padding: 16px; color: #64748b; font-size: 13px; max-width: 200px;">
                      <div style="display: flex; align-items: flex-start; gap: 6px;" [title]="trip.client?.address || trip.details?.[0]?.deliveryAddress || 'Sin dirección'">
                        <i class="fa-solid fa-location-dot" style="color: #cbd5e1; margin-top: 2px;"></i>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          {{ trip.client?.address || trip.details?.[0]?.deliveryAddress || 'Sin dirección' }}
                        </span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .trips-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: #1e293b;
      font-weight: 700;
    }

    .page-header .subtitle {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .filters-bar {
      display: flex;
      align-items: center;
    }

    .filter-tabs {
      display: flex;
      gap: 6px;
      background: white;
      padding: 4px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .tab {
      padding: 8px 18px;
      border: none;
      background: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .tab:hover {
      color: #1e293b;
      background: #f1f5f9;
    }

    .tab--active {
      background: #3d39af !important;
      color: white !important;
    }

    .empty-card {
      background: white;
      border-radius: 16px;
      padding: 60px 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ede9fe;
      display: grid;
      place-items: center;
      font-size: 28px;
      color: #6366f1;
      margin-bottom: 20px;
    }

    .empty-card h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .empty-card p {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
      max-width: 360px;
      line-height: 1.6;
    }
    
    .table-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }
    
    .status-pendiente { background: #fef3c7; color: #b45309; }
    .status-en_proceso { background: #dbeafe; color: #1d4ed8; }
    .status-completado { background: #dcfce3; color: #166534; }
    .status-confirmado { background: #e0e7ff; color: #3730a3; }
    .status-cancelado { background: #fee2e2; color: #b91c1c; }
  `]
})
export class DriverTripsComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  
  activeFilter = signal('all');
  trips = signal<any[]>([]);
  filteredTrips = signal<any[]>([]);
  loading = signal(true);
  private pollSub?: Subscription;

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  startPolling(): void {
    const user = this.auth.user();
    if (!user?.idDriver) {
      this.loading.set(false);
      return;
    }
    
    // Poll every 10 seconds to get immediate assignments
    this.pollSub = interval(10000).pipe(
      startWith(0),
      switchMap(() => {
        let p = new HttpParams()
          .set('idDriver', user.idDriver!)
          .set('perPage', 50); // Get latest trips
        return this.orderService.getOrders(p);
      })
    ).subscribe({
      next: (res) => {
        this.trips.set(res.data || []);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching trips:', err);
        this.loading.set(false);
      }
    });
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
    this.applyFilter();
  }

  applyFilter(): void {
    const all = this.trips();
    const filter = this.activeFilter();
    
    if (filter === 'all') {
      this.filteredTrips.set(all);
    } else if (filter === 'pending') {
      this.filteredTrips.set(all.filter(t => t.status === 'pendiente' || t.status === 'confirmado' || t.status === 'en_transito' || t.status === 'en_proceso'));
    } else if (filter === 'completed') {
      this.filteredTrips.set(all.filter(t => t.status === 'completado' || t.status === 'entregado'));
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente:  'Pendiente',
      confirmado: 'Confirmado',
      en_proceso: 'En proceso',
      completado: 'Completado',
      cancelado:  'Cancelado',
    };
    return map[status] ?? status;
  }
}
