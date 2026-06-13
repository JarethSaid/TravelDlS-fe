import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruckService } from '../../services/truck.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { TruckFormComponent } from './truck-form.component';

// ==========================================
// 1. Tipos e Interfaces (Sincronizado con AdonisJS v6)
// ==========================================
export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export interface Company { idCompany: number; businessName: string; ruc?: string; }
export interface Driver { idDriver: number; name?: string; user?: { name: string }; }
export interface Category { idCategory: number; name?: string; nameCategory?: string; status: CategoryStatus; }

export interface Truck {
  idTruck: number;
  idCompany: number;
  idDriver: number | null;
  idCategory: number;
  chassis: string;
  plate: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  company?: Company;
  driver?: Driver | null;
  category?: Category;
}

@Component({
  selector: 'app-trucks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TruckFormComponent],
  template: `
    <div>
      <!-- Encabezado Principal -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Camiones</h1>
          <p class="page-sub">{{ total() }} camiones en tu flota</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" [class.spinning]="loading()" (click)="refresh()" title="Actualizar lista">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="btn-nuevo" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nuevo Camión
          </button>
        </div>
      </div>

      <!-- Barra de Acciones y Búsqueda -->
      <div class="barra-acciones" style="margin-bottom: 20px">
        <div class="contenedor-busqueda">
          <i class="fa-solid fa-magnifying-glass icono-busqueda"></i>
          <input
            class="input-busqueda"
            type="text"
            placeholder="Buscar por placa o chasis..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
          />
        </div>
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

      <!-- Tabla de Camiones -->
      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Chasis</th>
              <th>Empresa</th>
              <th>Conductor</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th class="txt-centro">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="7" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (trucks().length === 0) {
              <!-- Empty State de Camiones -->
              <tr>
                <td colspan="7" class="tabla-vacia" style="padding: 40px 0; text-align: center;">
                  <div style="font-size: 3rem; color: #cbd5e1; margin-bottom: 12px;">
                    <i class="fa-solid fa-truck"></i>
                  </div>
                  <p style="margin: 0; font-size: 15px; color: #64748b; font-weight: 500;">
                    No hay camiones registrados en tu flota
                  </p>
                </td>
              </tr>
            } @else {
              @for (t of trucks(); track t.idTruck) {
                <tr>
                  <td class="txt-negrita">{{ t.plate }}</td>
                  <td>{{ t.chassis }}</td>
                  <td>{{ t.company?.businessName ?? '—' }}</td>
                  <td>
                    @if (t.driver?.user?.name || t.driver?.name) {
                      {{ t.driver!.user?.name || t.driver!.name }}
                    } @else {
                      <span class="badge-status badge-offline" style="font-size: 11px; padding: 2px 8px;">Sin asignar</span>
                    }
                  </td>
                  <td>{{ (t.category?.nameCategory || t.category?.name) ?? '—' }}</td>
                  <td>
                    <span
                      [class]="getStatusBadge(t).class"
                      [style]="getStatusBadge(t).style"
                    >
                      {{ getStatusBadge(t).label }}
                    </span>
                  </td>
                  <td>
                    <div class="acciones-celda">
                      <button class="btn-accion btn-editar" title="Editar" (click)="openEdit(t)">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button class="btn-accion btn-eliminar" title="Eliminar" (click)="confirmDelete(t)">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Paginación Estándar -->
      <div class="paginacion-estandar">
        <span class="pag-rango">{{ rangeLabel() }}</span>
        <div class="pag-controles">
          <button class="btn-pag" [disabled]="currentPage() <= 1 || loading()" (click)="goPage(1)">
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
          <button class="btn-pag" [disabled]="currentPage() >= totalPages() || loading()" (click)="goPage(totalPages())">
            <i class="fa-solid fa-angles-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Formulario -->
    @if (showForm()) {
      <app-truck-form
        [truck]="editingTruck()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: ``,
})
export class TrucksListComponent implements OnInit {
  private readonly svc = inject(TruckService);
  private readonly ui = inject(InteractionService);

  // Signals de estado general
  trucks = signal<Truck[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);

  // Signals para Modal
  showForm = signal(false);
  editingTruck = signal<Truck | null>(null);

  // Variables de control de UI (Buscador y Paginador)
  searchTerm = '';
  perPage = 10;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Selectores Computados (Paginación)
  rangeLabel = computed(() => {
    if (this.total() === 0) return 'Mostrando 0 - 0 de 0 camiones';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `Mostrando ${start} - ${end} de ${this.total()} camiones`;
  });

  pagesArray = computed(() => {
    const current = this.currentPage();
    const last = this.totalPages();
    const delta = 2;
    const left = current - delta;
    const right = current + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || (i >= left && i < right)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({
      page: this.currentPage(),
      perPage: this.perPage,
      search: this.searchTerm || undefined
    }).subscribe({
      next: (res) => {
        this.trucks.set(res.data as unknown as Truck[]);
        this.total.set(res.meta.total);
        this.totalPages.set(res.meta.lastPage);
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

  onPerPageChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  refresh(): void {
    this.load();
  }

  goPage(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.currentPage()) {
      this.currentPage.set(p);
      this.load();
    }
  }

  // Lógica del Estado del Badge Dinámico
  getStatusBadge(t: Truck): { label: string; class: string; style?: string } {
    // Priorizamos el estado propio del camión (t.status). Si no está definido, usamos el de su categoría.
    const status = (t.status as string)?.toLowerCase() || (t.category?.status as string)?.toLowerCase();
    
    // Si el estado es ACTIVO
    if (status === 'active' || status === 'activo' || status === CategoryStatus.ACTIVE) {
      if (t.idDriver) {
        return { label: 'Activo', class: 'badge-estado badge-activo' };
      } else {
        // Celeste / Azul "Disponible"
        return { 
          label: 'Disponible', 
          class: 'badge-estado', 
          style: 'background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe;' 
        };
      }
    } 
    
    // Si el estado es en MANTENIMIENTO
    if (status === 'maintenance' || status === 'mantenimiento' || status === CategoryStatus.MAINTENANCE) {
      return { 
        label: 'Mantenimiento', 
        class: 'badge-estado', 
        style: 'background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5;' 
      };
    } 
    
    // Si el estado es INACTIVO
    return { label: 'Inactivo', class: 'badge-estado badge-inactivo' };
  }

  openCreate(): void {
    this.editingTruck.set(null);
    this.showForm.set(true);
  }

  openEdit(t: Truck): void {
    this.editingTruck.set(t);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTruck.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.load();
    this.ui.showToast('Camión guardado', 'success');
  }

  confirmDelete(t: Truck): void {
    this.ui
      .confirmar('Eliminar camión', `¿Eliminar camión con placa "${t.plate}"?`)
      .then((ok) => {
        if (!ok) return;
        this.ui.showLoading();
        this.svc.delete(t.idTruck).subscribe({
          next: () => {
            this.ui.hideLoading();
            this.ui.showToast('Camión eliminado', 'success');
            if (this.trucks().length === 1 && this.currentPage() > 1) {
              this.currentPage.update(p => p - 1);
            }
            this.load();
          },
          error: (err) => {
            this.ui.hideLoading();
            this.ui.showToast(getHttpErrorMessage(err), 'error');
          },
        });
      });
  }
}

