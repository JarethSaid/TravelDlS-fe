import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruckService } from '../../service/truck.service';
import { Truck } from '../../interface/truck.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { TruckFormComponent } from './truck-form.component';

@Component({
  selector: 'app-trucks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TruckFormComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Camiones</h1>
          <p class="page-sub">{{ total() }} camiones registrados</p>
        </div>
        <button class="btn-nuevo" (click)="openCreate()">
          <i class="fa-solid fa-plus"></i> Nuevo Camión
        </button>
      </div>

      <!-- Search / filter -->
      <div class="barra-acciones" style="margin-bottom: 20px">
        <div class="contenedor-busqueda">
          <i class="fa-solid fa-magnifying-glass icono-busqueda"></i>
          <input
            class="input-busqueda"
            type="text"
            placeholder="Filtrar por placa…"
            [(ngModel)]="searchTerm"
          />
        </div>
      </div>

      <!-- Table -->
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
            } @else if (filteredTrucks().length === 0) {
              <tr>
                <td colspan="7" class="tabla-vacia">No se encontraron camiones.</td>
              </tr>
            } @else {
              @for (t of filteredTrucks(); track t.idTruck) {
                <tr>
                  <td class="txt-negrita">{{ t.plate }}</td>
                  <td>{{ t.chassis }}</td>
                  <td>{{ t.company?.businessName ?? '—' }}</td>
                  <td>{{ t.driver?.user?.name ?? '—' }}</td>
                  <td>{{ t.category?.nameCategory ?? '—' }}</td>
                  <td>
                    <span [class]="t.deletedAt ? 'badge-estado badge-inactivo' : 'badge-estado badge-activo'">
                      {{ t.deletedAt ? 'Inactivo' : 'Activo' }}
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

    @if (showForm()) {
      <app-truck-form
        [truck]="editingTruck()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: `
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .page-title { margin: 0 0 4px; font-size: 24px; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; font-size: 13px; color: #64748b; }
    .btn-nuevo {
      background: #3d39af; color: white; border: none; padding: 11px 20px;
      border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: 0.2s; white-space: nowrap;
    }
    .btn-nuevo:hover { opacity: 0.88; transform: translateY(-1px); }
    .badge-estado { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .badge-activo { background: #dcfce7; color: #16a34a; }
    .badge-inactivo { background: #fee2e2; color: #dc2626; }
  `,
})
export class TrucksListComponent implements OnInit {
  private readonly svc = inject(TruckService);
  private readonly ui = inject(InteractionService);

  trucks = signal<Truck[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = '';
  showForm = signal(false);
  editingTruck = signal<Truck | null>(null);

  filteredTrucks() {
    if (!this.searchTerm.trim()) return this.trucks();
    const term = this.searchTerm.toLowerCase();
    return this.trucks().filter(
      (t) =>
        t.plate?.toLowerCase().includes(term) ||
        t.chassis?.toLowerCase().includes(term)
    );
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({ page: this.currentPage(), perPage: 10 }).subscribe({
      next: (res) => {
        this.trucks.set(res.data);
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

  goPage(p: number): void {
    this.currentPage.set(p);
    this.load();
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
