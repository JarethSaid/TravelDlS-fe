import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CategoryService } from '../../services/category.service';
import { Category } from '../../interface/category.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { CategoryFormComponent } from './category-form.component';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, CategoryFormComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Categorías</h1>
          <p class="page-sub">{{ total() }} categorías registradas</p>
        </div>
        <button class="btn-nuevo" (click)="openCreate()">
          <i class="fa-solid fa-plus"></i> Nueva Categoría
        </button>
      </div>

      <!-- Table -->
      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>Nombre de Categoría</th>
              <th>Estado</th>
              <th class="txt-centro">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="3" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (categories().length === 0) {
              <tr>
                <td colspan="3" class="tabla-vacia">No hay categorías registradas.</td>
              </tr>
            } @else {
              @for (c of categories(); track c.idCategory) {
                <tr>
                  <td class="txt-negrita">{{ c.nameCategory }}</td>
                  <td>
                    <span [class]="c.status === 'activo' ? 'badge-estado badge-activo' : c.status === 'mantenimiento' ? 'badge-estado badge-warning' : 'badge-estado badge-inactivo'">
                      {{ c.status === 'activo' ? 'Activo' : c.status === 'mantenimiento' ? 'Mantenimiento' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="acciones-celda">
                      <button class="btn-accion btn-editar" title="Editar" (click)="openEdit(c)">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button class="btn-accion btn-eliminar" title="Eliminar" (click)="confirmDelete(c)">
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
      <app-category-form
        [category]="editingCategory()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: ``,
})
export class CategoriesListComponent implements OnInit {
  private readonly svc = inject(CategoryService);
  private readonly ui = inject(InteractionService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  showForm = signal(false);
  editingCategory = signal<Category | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({ page: this.currentPage(), perPage: 15 }).subscribe({
      next: (res) => {
        this.categories.set(res.data);
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
    this.editingCategory.set(null);
    this.showForm.set(true);
  }

  openEdit(c: Category): void {
    this.editingCategory.set(c);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCategory.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.load();
    this.ui.showToast('Categoría guardada', 'success');
  }

  confirmDelete(c: Category): void {
    this.ui
      .confirmar('Eliminar categoría', `¿Eliminar la categoría "${c.nameCategory}"?`)
      .then((ok) => {
        if (!ok) return;
        this.ui.showLoading();
        this.svc.delete(c.idCategory).subscribe({
          next: () => {
            this.ui.hideLoading();
            this.ui.showToast('Categoría eliminada', 'success');
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
