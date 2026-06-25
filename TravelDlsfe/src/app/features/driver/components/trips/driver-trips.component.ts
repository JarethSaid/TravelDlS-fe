import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../company/services/order.service';
import { HttpParams } from '@angular/common/http';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { resolveOrderDeliveryAddress } from '../../../../shared/utils/order-address.util';

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

      <div class="filters-bar">
        <div class="filter-tabs">
          <button class="tab" [class.tab--active]="activeFilter() === 'all'" (click)="setFilter('all')">Todos</button>
          <button class="tab" [class.tab--active]="activeFilter() === 'pending'" (click)="setFilter('pending')">Pendientes</button>
          <button class="tab" [class.tab--active]="activeFilter() === 'completed'" (click)="setFilter('completed')">Completados</button>
        </div>
      </div>

      @if (loading() && trips().length === 0) {
        <div class="empty-card">
          <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
          <h3>Cargando viajes…</h3>
        </div>
      } @else if (filteredTrips().length === 0) {
        <div class="empty-card">
          <div class="empty-icon"><i class="fa-solid fa-route"></i></div>
          <h3>No hay viajes registrados</h3>
          <p>Cuando te asignen viajes, aparecerán aquí para que puedas darles seguimiento.</p>
        </div>
      } @else {
        <div class="table-card">
          <div class="table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th># Viaje</th>
                  <th>Cliente</th>
                  <th>Carga</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (trip of filteredTrips(); track trip.idOrder) {
                  <tr>
                    <td class="trip-id">#{{ trip.idOrder }}</td>
                    <td>
                      <div class="trip-client">{{ trip.client?.companyName || trip.client?.user?.name || 'Cliente #' + trip.idClient }}</div>
                    </td>
                    <td>
                      <div class="trip-cargo">{{ trip.details?.[0]?.cargoDescription || 'Sin descripción' }}</div>
                    </td>
                    <td>
                      <div class="trip-address" [title]="deliveryAddress(trip)">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>{{ deliveryAddress(trip) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-chip" [class]="'status-chip status-' + trip.status">
                        {{ statusLabel(trip.status) }}
                      </span>
                    </td>
                    <td>
                      @if (trip.status === 'aceptado') {
                        @if (hasActiveTrip()) {
                          <span style="color: #94a3b8; font-size: 13px; font-weight: 500; font-style: italic;">
                            <i class="fa-solid fa-lock" style="margin-right: 4px;"></i> Otro viaje en curso
                          </span>
                        } @else {
                          <button
                            class="btn-start-trip"
                            (click)="startTrip(trip)"
                            [disabled]="actionLoading() === trip.idOrder"
                          >
                            @if (actionLoading() === trip.idOrder) {
                              <i class="fa-solid fa-spinner fa-spin"></i>
                            } @else {
                              <i class="fa-solid fa-play"></i>
                            }
                            Iniciar Viaje
                          </button>
                        }
                      }

                      @if (trip.status === 'en_transito') {
                        <button
                          class="btn-end-trip"
                          (click)="endTrip(trip)"
                          [disabled]="actionLoading() === trip.idOrder"
                        >
                          @if (actionLoading() === trip.idOrder) {
                            <i class="fa-solid fa-spinner fa-spin"></i>
                          } @else {
                            <i class="fa-solid fa-flag-checkered"></i>
                          }
                          Finalizar Viaje
                        </button>

                        @if (activeTrackingOrderId() === trip.idOrder) {
                          <div class="gps-indicator">
                            <span class="gps-dot"></span>
                            {{ gpsStatus() }}
                          </div>
                        }
                      }
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

    .tab:hover { color: #1e293b; background: #f1f5f9; }
    .tab--active { background: #3d39af !important; color: white !important; }

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

    .empty-card h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; }
    .empty-card p { margin: 0; font-size: 14px; color: #94a3b8; max-width: 360px; line-height: 1.6; }

    .table-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }

    .table-wrapper { overflow-x: auto; }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table thead tr {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .orders-table th {
      padding: 12px 16px;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      text-align: left;
    }

    .orders-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }

    .orders-table tbody tr:hover { background: #f8fafc; }
    .orders-table td { padding: 14px 16px; }

    .trip-id { font-weight: 700; color: #0f172a; font-size: 14px; }
    .trip-client { color: #334155; font-weight: 500; font-size: 14px; }
    .trip-cargo { font-size: 13px; color: #334155; font-weight: 500; }
    .trip-cargo-meta { font-size: 12px; color: #64748b; margin-top: 2px; }

    .trip-address {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      color: #64748b;
      font-size: 13px;
      max-width: 200px;
    }

    .trip-address i { color: #cbd5e1; margin-top: 2px; flex-shrink: 0; }
    .trip-address span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

    .btn-start-trip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      box-shadow: 0 2px 6px rgba(34,197,94,0.35);
    }

    .btn-start-trip:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(34,197,94,0.4); }
    .btn-start-trip:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .btn-end-trip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      box-shadow: 0 2px 6px rgba(239,68,68,0.35);
    }

    .btn-end-trip:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(239,68,68,0.4); }
    .btn-end-trip:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .gps-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 4px 10px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 20px;
      color: #16a34a;
      font-size: 11px;
      font-weight: 600;
    }

    .gps-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse-gps 1.5s ease-in-out infinite;
    }

    @keyframes pulse-gps {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
  `]
})
export class DriverTripsComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  readonly deliveryAddress = resolveOrderDeliveryAddress;

  activeFilter = signal('all');
  trips = signal<any[]>([]);
  filteredTrips = signal<any[]>([]);
  hasActiveTrip = computed(() => this.trips().some((t) => t.status === 'en_transito'));
  loading = signal(true);
  actionLoading = signal<number | null>(null);
  activeTrackingOrderId = signal<number | null>(null);
  gpsStatus = signal('GPS activo');

  private pollSub?: Subscription;
  private locationWatchId: number | null = null;
  private locationIntervalSub?: Subscription;
  private currentCoords: { lat: number; lng: number } | null = null;
  private readonly goodGpsAccuracyMeters = 100;
  private readonly maxGpsAccuracyMeters = 500;

  ngOnInit(): void {
    this.startPolling();
  }

  private distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stopGeolocation();
  }

  startPolling(): void {
    const user = this.auth.user();
    if (!user?.idDriver) {
      this.loading.set(false);
      return;
    }

    this.pollSub = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => {
          const p = new HttpParams().set('idDriver', user.idDriver!).set('perPage', 50);
          return this.orderService.getOrders(p);
        }),
      )
      .subscribe({
        next: (res) => {
          this.trips.set(res.data || []);
          this.applyFilter();
          this.loading.set(false);

          if (this.activeTrackingOrderId() === null) {
            const activeTrip = (res.data || []).find((t: any) => t.status === 'en_transito');
            if (activeTrip) {
              this.startGeolocation(activeTrip.idOrder);
            }
          }
        },
        error: () => this.loading.set(false),
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
      this.filteredTrips.set(
        all.filter((t) =>
          ['pendiente', 'confirmado', 'esperando_aprobacion', 'aceptado', 'en_transito'].includes(
            t.status,
          ),
        ),
      );
    } else if (filter === 'completed') {
      this.filteredTrips.set(all.filter((t) => ['entregado'].includes(t.status)));
    }
  }

  startTrip(trip: any): void {
    if (trip.status !== 'aceptado') return;
    this.actionLoading.set(trip.idOrder);
    this.orderService.updateOrderStatus(trip.idOrder, 'en_transito').subscribe({
      next: () => {
        trip.status = 'en_transito';
        this.trips.update((list) => [...list]);
        this.applyFilter();
        this.actionLoading.set(null);
        this.startGeolocation(trip.idOrder);
      },
      error: () => this.actionLoading.set(null),
    });
  }

  endTrip(trip: any): void {
    this.actionLoading.set(trip.idOrder);
    this.orderService.updateOrderStatus(trip.idOrder, 'entregado').subscribe({
      next: () => {
        trip.status = 'entregado';
        this.trips.update((list) => [...list]);
        this.applyFilter();
        this.actionLoading.set(null);
        this.stopGeolocation();
      },
      error: () => this.actionLoading.set(null),
    });
  }

  private startGeolocation(idOrder: number): void {
    this.stopGeolocation();
    this.activeTrackingOrderId.set(idOrder);
    this.gpsStatus.set('Esperando GPS real...');

    if (!navigator.geolocation) {
      this.gpsStatus.set('GPS no disponible');
      return;
    }

    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) {
          this.gpsStatus.set('GPS inválido');
          return;
        }

        if (Number.isFinite(accuracy) && accuracy > this.maxGpsAccuracyMeters) {
          this.gpsStatus.set(`GPS muy impreciso (${Math.round(accuracy)} m)`);
          return;
        }

        if (Number.isFinite(accuracy) && accuracy > this.goodGpsAccuracyMeters) {
          this.gpsStatus.set(`GPS aproximado (${Math.round(accuracy)} m)`);
        } else {
          this.gpsStatus.set('GPS activo');
        }

        if (!this.currentCoords) {
          this.currentCoords = { lat: newLat, lng: newLng };
          this.orderService.updateOrderLocation(idOrder, newLat, newLng).subscribe({ error: () => {} });
        } else {
          const dist = this.distanceMeters(
            this.currentCoords.lat,
            this.currentCoords.lng,
            newLat,
            newLng,
          );
          if (dist >= 10) {
            this.orderService.updateOrderLocation(idOrder, newLat, newLng).subscribe({ error: () => {} });
          }
          this.currentCoords = { lat: newLat, lng: newLng };
        }
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        this.gpsStatus.set(denied ? 'GPS sin permiso' : 'GPS sin señal');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    this.locationIntervalSub = interval(15000).subscribe(() => {
      if (!this.currentCoords) return;
      this.orderService
        .updateOrderLocation(idOrder, this.currentCoords.lat, this.currentCoords.lng)
        .subscribe({ error: () => {} });
    });
  }

  private stopGeolocation(): void {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
    this.locationIntervalSub?.unsubscribe();
    this.locationIntervalSub = undefined;
    this.currentCoords = null;
    this.activeTrackingOrderId.set(null);
    this.gpsStatus.set('GPS activo');
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
    };
    return map[status] ?? status;
  }
}
