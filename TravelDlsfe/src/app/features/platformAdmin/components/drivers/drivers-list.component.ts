import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { DriverService } from '../../services/driver.service';
import { DriverLinkFormComponent } from './driver-link-form.component';
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
  company?: { idCompany: number; businessName: string; ruc: string };
  user?: { name: string; email: string };
}

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverLinkFormComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Conductores</h1>
          <p class="page-sub">{{ total() }} conductores registrados</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" [class.spinning]="loading()" (click)="refresh()" title="Actualizar lista">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="btn-nuevo" (click)="showLinkForm.set(true)">
            <i class="fa-solid fa-link"></i> Vincular a Empresa
          </button>
        </div>
      </div>

      <!-- Search bar -->
      <div class="barra-acciones" style="margin-bottom: 20px">
        <div class="contenedor-busqueda">
          <i class="fa-solid fa-magnifying-glass icono-busqueda"></i>
          <input
            class="input-busqueda"
            type="text"
            placeholder="Buscar por nombre, licencia o empresa…"
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
        <div class="per-page-control">
          <label class="per-page-label">Por página:</label>
          <select class="filter-select" [(ngModel)]="perPage" (ngModelChange)="onPerPageChange()">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
          </select>
        </div>
      </div>

      <!-- Table -->
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

      <!-- Pagination -->
      <div class="paginacion-estandar">
        <span class="pag-rango">{{ rangeLabel() }}</span>
        <div class="pag-controles">
          <button class="btn-pag" [disabled]="currentPage() <= 1 || loading()" (click)="goPage(1)" title="Primera página">
            <i class="fa-solid fa-angles-left"></i>
          </button>
          <button class="btn-pag" [disabled]="currentPage() <= 1 || loading()" (click)="goPage(currentPage() - 1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="pag-numeros">
            @for (p of pagesArray(); track $index) {
              @if (p === '...') {
                <span class="pag-ellipsis">...</span>
              } @else {
                <button
                  class="btn-pag-num"
                  [class.active]="p === currentPage()"
                  (click)="goPage($any(p))"
                  [disabled]="loading()"
                >
                  {{ p }}
                </button>
              }
            }
          </div>
          <button class="btn-pag" [disabled]="currentPage() >= totalPages() || loading()" (click)="goPage(currentPage() + 1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button class="btn-pag" [disabled]="currentPage() >= totalPages() || loading()" (click)="goPage(totalPages())" title="Última página">
            <i class="fa-solid fa-angles-right"></i>
          </button>
        </div>
      </div>

      @if (showLinkForm()) {
        <app-driver-link-form
          (saved)="onLinkSaved()"
          (cancelled)="showLinkForm.set(false)"
        />
      }
    </div>
  `,
  styles: ``,
})
export class DriversListComponent implements OnInit {
  private readonly driverService = inject(DriverService);
  private readonly ui = inject(InteractionService);

  drivers = signal<Driver[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 10;
  searchTerm = '';
  statusFilter = '';

  showLinkForm = signal(false);

  rangeLabel = computed(() => {
    const t = this.total();
    if (t === 0) return 'Sin resultados';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, t);
    return `Mostrando ${start}–${end} de ${t}`;
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let p = new HttpParams()
      .set('page', this.currentPage())
      .set('perPage', this.perPage);
    if (this.searchTerm) p = p.set('search', this.searchTerm);
    if (this.statusFilter) p = p.set('status', this.statusFilter);

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

  refresh(): void {
    this.load();
    this.ui.showToast('Lista actualizada', 'success');
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.load();
    }, 400);
  }

  onPerPageChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  goPage(p: number): void {
    this.currentPage.set(p);
    this.load();
  }

  onLinkSaved(): void {
    this.showLinkForm.set(false);
    this.load();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Disponible',
      ontrip:    'En viaje',
      offline:   'Desconectado',
      inactive:  'Inactivo',
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
