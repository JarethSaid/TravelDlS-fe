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
          <button class="btn-refresh" title="Actualizar lista" (click)="refresh()" [disabled]="loading()">
            <i class="fa-solid fa-rotate-right" [class.fa-spin]="loading()"></i>
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
          <option value="on_trip">En viaje</option>
          <option value="offline">Desconectado</option>
          <option value="inactive">Inactivo</option>
        </select>
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

      @if (drivers().length > 0 || currentPage() > 1) {
        <div class="paginacion-estandar">
          <div class="pag-info">
            <label class="pag-perpage-label">Filas:
              <select class="pag-perpage-select" [(ngModel)]="perPage" (ngModelChange)="onPerPageChange()">
                <option [value]="5">5</option>
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
              </select>
            </label>
          </div>
          <div class="pag-controles">
            <button class="btn-pag" [disabled]="currentPage() <= 1" (click)="goPage(1)" title="Primera página">
              <i class="fa-solid fa-angles-left"></i>
            </button>
            <button class="btn-pag" [disabled]="currentPage() <= 1" (click)="goPage(currentPage() - 1)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            @for (p of pageNumbers(); track p) {
              @if (p === -1) {
                <span class="pag-ellipsis">…</span>
              } @else {
                <button class="btn-pag-num" [class.activo]="p === currentPage()" (click)="goPage(p)">{{ p }}</button>
              }
            }
            <button class="btn-pag" [disabled]="currentPage() >= totalPages()" (click)="goPage(currentPage() + 1)">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button class="btn-pag" [disabled]="currentPage() >= totalPages()" (click)="goPage(totalPages())" title="Última página">
              <i class="fa-solid fa-angles-right"></i>
            </button>
          </div>
          <span class="pag-resumen">{{ paginationSummary() }}</span>
        </div>
      }

      @if (showLinkForm()) {
        <app-driver-link-form
          (saved)="onLinkSaved()"
          (cancelled)="showLinkForm.set(false)"
        />
      }
    </div>
  `,
  styles: `
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .btn-refresh {
      display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 10px; border: 1.5px solid var(--border-color, #334155);
      background: transparent; color: var(--text-secondary, #94a3b8); cursor: pointer;
      font-size: 16px; transition: all 0.2s;
    }
    .btn-refresh:hover:not(:disabled) { background: var(--bg-hover, #1e293b); color: var(--accent, #6366f1); border-color: var(--accent, #6366f1); }
    .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
    .paginacion-estandar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
    .pag-info { display: flex; align-items: center; gap: 8px; }
    .pag-perpage-label { font-size: 13px; color: var(--text-secondary, #94a3b8); display: flex; align-items: center; gap: 6px; }
    .pag-perpage-select { background: var(--bg-card, #1e293b); color: var(--text-primary, #f1f5f9); border: 1.5px solid var(--border-color, #334155); border-radius: 8px; padding: 4px 8px; font-size: 13px; cursor: pointer; }
    .pag-controles { display: flex; align-items: center; gap: 4px; }
    .btn-pag { background: var(--bg-card, #1e293b); border: 1.5px solid var(--border-color, #334155); color: var(--text-secondary, #94a3b8); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .btn-pag:hover:not(:disabled) { background: var(--accent, #6366f1); color: #fff; border-color: var(--accent, #6366f1); }
    .btn-pag:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-pag-num { background: var(--bg-card, #1e293b); border: 1.5px solid var(--border-color, #334155); color: var(--text-secondary, #94a3b8); border-radius: 8px; padding: 6px 11px; cursor: pointer; font-size: 14px; transition: all 0.2s; min-width: 36px; }
    .btn-pag-num:hover:not(.activo) { background: var(--bg-hover, #0f172a); color: var(--accent, #6366f1); }
    .btn-pag-num.activo { background: var(--accent, #6366f1); color: #fff; border-color: var(--accent, #6366f1); font-weight: 600; }
    .pag-ellipsis { color: var(--text-secondary, #94a3b8); padding: 0 4px; }
    .pag-resumen { font-size: 13px; color: var(--text-secondary, #94a3b8); white-space: nowrap; }
    .filter-select { background: var(--bg-card, #1e293b); color: var(--text-primary, #f1f5f9); border: 1.5px solid var(--border-color, #334155); border-radius: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer; }
  `,
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

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  pageNumbers = computed(() => this.buildPageNumbers(this.currentPage(), this.totalPages()));

  paginationSummary = computed(() => {
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `${start}–${end} de ${this.total()}`;
  });

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
  }

  onPerPageChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  buildPageNumbers(current: number, total: number): number[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
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

  onLinkSaved(): void {
    this.showLinkForm.set(false);
    this.load();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Disponible',
      on_trip:   'En viaje',
      offline:   'Desconectado',
      inactive:  'Inactivo',
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
