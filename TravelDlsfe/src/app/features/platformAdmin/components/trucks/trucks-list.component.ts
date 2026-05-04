import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruckService } from '../../services/truck.service';
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
            placeholder="Buscar por placa o chasis…"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
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
            } @else if (trucks().length === 0) {
              <tr>
                <td colspan="7" class="tabla-vacia">No se encontraron camiones.</td>
              </tr>
            } @else {
              @for (t of trucks(); track t.idTruck) {
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
  styles: ``,
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

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.load();
    }, 400);
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({ page: this.currentPage(), perPage: 10, search: this.searchTerm || undefined }).subscribe({
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
