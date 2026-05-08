import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { CompanyDriverService } from '../../services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface Driver {
  idDriver: number;
  license: string;
  passport: string;
  status: string;
  photoUrl: string | null;
  deletedAt: string | null;
  user?: { name: string; email: string };
}

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Conductores</h1>
          <p class="page-sub">{{ total() }} conductores en tu empresa</p>
        </div>
      </div>

      <!-- Card con toolbar + tabla -->
      <div class="company-content-card">
        <div class="company-toolbar">
          <div class="company-search-box">
            <i class="fa-solid fa-magnifying-glass company-search-icon"></i>
            <input
              class="company-search-input"
              type="text"
              placeholder="Buscar conductor…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onSearch()">
            <option value="">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="ontrip">En viaje</option>
            <option value="offline">Desconectado</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div class="tabla-contenedor" style="border-radius:0; border:none; box-shadow:none;">
          <table class="tabla-resort">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Licencia</th>
                <th>Pasaporte</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="4" class="tabla-vacia"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>
              } @else if (drivers().length === 0) {
                <tr>
                  <td colspan="4">
                    <div class="empty-state-company">
                      <div class="empty-state-icon"><i class="fa-solid fa-user-group"></i></div>
                      <p class="empty-state-text">No hay conductores registrados en tu empresa</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (d of drivers(); track d.idDriver) {
                  <tr>
                    <td>
                      <div class="driver-id-cell">
                        <div class="driver-avatar"><i class="fa-solid fa-user-tie"></i></div>
                        <div>
                          <span class="txt-negrita">{{ d.user?.name ?? ('Conductor #' + d.idDriver) }}</span>
                          @if (d.user?.email) {
                            <br><span class="txt-sub">{{ d.user!.email }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>{{ d.license }}</td>
                    <td>{{ d.passport }}</td>
                    <td><span [class]="statusBadgeClass(d.status)">{{ statusLabel(d.status) }}</span></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (totalPages() > 1) {
          <div class="paginacion-estandar" style="padding: 16px 0;">
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
    </div>
  `,
  styles: ``,
})
export class DriversListComponent implements OnInit {
  private readonly driverService = inject(CompanyDriverService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  drivers = signal<Driver[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = '';
  statusFilter = '';

  private companyId: number | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.companyId = this.auth.user()?.idCompany ?? null;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let p = new HttpParams()
      .set('page', this.currentPage())
      .set('perPage', 10);
    if (this.searchTerm)  p = p.set('search', this.searchTerm);
    if (this.statusFilter) p = p.set('status', this.statusFilter);
    if (this.companyId)   p = p.set('idCompany', this.companyId);

    this.driverService.getDrivers(p).subscribe({
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

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.load();
    }, 400);
  }

  goPage(p: number): void {
    this.currentPage.set(p);
    this.load();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Disponible', ontrip: 'En viaje',
      offline: 'Desconectado', inactive: 'Inactivo',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      available: 'badge-status badge-available',
      ontrip:    'badge-status badge-ontrip',
      offline:   'badge-status badge-offline',
      inactive:  'badge-status badge-inactive',
    };
    return map[status] ?? 'badge-status badge-offline';
  }
}
