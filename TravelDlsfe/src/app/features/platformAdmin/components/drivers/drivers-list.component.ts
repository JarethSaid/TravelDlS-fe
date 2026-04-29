import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../../core/api-base-url';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface Driver {
  idDriver: number;
  userId: number;
  license: string;
  passport: string;
  status: string;
  photoUrl: string | null;
  deletedAt: string | null;
  idCompany: number;
  // El backend hace preload de company pero NO de user en el list
  company?: { idCompany: number; businessName: string; ruc: string };
  user?: { name: string; email: string };
}

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Conductores</h1>
          <p class="page-sub">{{ total() }} conductores registrados</p>
        </div>
      </div>

      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>ID / Usuario</th>
              <th>Licencia</th>
              <th>Pasaporte</th>
              <th>Empresa</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="5" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (drivers().length === 0) {
              <tr>
                <td colspan="5" class="tabla-vacia">No hay conductores registrados.</td>
              </tr>
            } @else {
              @for (d of drivers(); track d.idDriver) {
                <tr>
                  <td>
                    <div class="driver-id-cell">
                      <div class="driver-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                      </div>
                      <div>
                        <span class="txt-negrita">
                          {{ d.user?.name ?? ('Conductor #' + d.idDriver) }}
                        </span>
                        @if (d.user?.email) {
                          <br><span class="txt-sub">{{ d.user!.email }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td>{{ d.license }}</td>
                  <td>{{ d.passport }}</td>
                  <td>{{ d.company?.businessName ?? '—' }}</td>
                  <td>
                    <span [class]="statusBadgeClass(d.status)">
                      {{ statusLabel(d.status) }}
                    </span>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="paginacion-estandar">
          <button class="btn-pag" [disabled]="currentPage() <= 1" (click)="goPage(currentPage() - 1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span>Página {{ currentPage() }} de {{ totalPages() }}</span>
          <button class="btn-pag" [disabled]="currentPage() >= totalPages()" (click)="goPage(currentPage() + 1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .page-title { margin: 0 0 4px; font-size: 24px; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; font-size: 13px; color: #64748b; }

    .driver-id-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .driver-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #ede9fe;
      color: #6d28d9;
      display: grid;
      place-items: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .txt-sub {
      font-size: 11px;
      color: #94a3b8;
    }

    .badge-status {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .badge-available  { background: #dcfce7; color: #16a34a; }
    .badge-on_trip    { background: #dbeafe; color: #1d4ed8; }
    .badge-offline    { background: #f1f5f9; color: #64748b; }
    .badge-inactive   { background: #fee2e2; color: #dc2626; }
  `,
})
export class DriversListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly ui = inject(InteractionService);

  drivers = signal<Driver[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const p = new HttpParams().set('page', this.currentPage()).set('perPage', 10);
    this.http.get<any>(`${this.base}/api/drivers`, { params: p }).subscribe({
      next: (res) => {
        this.drivers.set(res.data ?? []);
        this.total.set(res.meta?.total ?? 0);
        this.totalPages.set(res.meta?.lastPage ?? 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.loading.set(false);
      },
    });
  }

  goPage(p: number): void {
    this.currentPage.set(p);
    this.load();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available:  'Disponible',
      on_trip:    'En viaje',
      offline:    'Desconectado',
      inactive:   'Inactivo',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      available: 'badge-status badge-available',
      on_trip:   'badge-status badge-on_trip',
      offline:   'badge-status badge-offline',
      inactive:  'badge-status badge-inactive',
    };
    return map[status] ?? 'badge-status badge-offline';
  }
}
