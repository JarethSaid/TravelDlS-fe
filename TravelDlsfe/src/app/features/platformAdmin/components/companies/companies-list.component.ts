import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { Company } from '../../interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { CompanyFormComponent } from './company-form.component';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyFormComponent],
  template: `
    <div>
      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Empresas</h1>
          <p class="page-sub">{{ total() }} empresas registradas</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" [class.spinning]="loading()" (click)="refresh()" title="Actualizar lista">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="btn-nuevo" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nueva Empresa
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
            placeholder="Buscar por nombre o RUC…"
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

      <!-- Table -->
      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>RUC</th>
              <th>Estado</th>
              <th class="txt-centro">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="4" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (companies().length === 0) {
              <tr>
                <td colspan="4" class="tabla-vacia">No se encontraron empresas.</td>
              </tr>
            } @else {
              @for (c of companies(); track c.idCompany) {
                <tr>
                  <td class="txt-negrita">{{ c.businessName }}</td>
                  <td>{{ c.ruc }}</td>
                  <td>
                    <span [class]="c.deletedAt ? 'badge-estado badge-inactivo' : 'badge-estado badge-activo'">
                      {{ c.deletedAt ? 'Inactivo' : 'Activo' }}
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
    </div>

    <!-- Modal Form -->
    @if (showForm()) {
      <app-company-form
        [company]="editingCompany()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: ``,
})
export class CompaniesListComponent implements OnInit {
  private readonly svc = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  companies = signal<Company[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 10;
  searchTerm = '';
  showForm = signal(false);
  editingCompany = signal<Company | null>(null);

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
    this.svc
      .list({ page: this.currentPage(), perPage: this.perPage, search: this.searchTerm || undefined })
      .subscribe({
        next: (res) => {
          this.companies.set(res.data);
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

  openCreate(): void {
    this.editingCompany.set(null);
    this.showForm.set(true);
  }

  openEdit(c: Company): void {
    this.editingCompany.set(c);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCompany.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.load();
    this.ui.showToast('Empresa guardada', 'success');
  }

  confirmDelete(c: Company): void {
    this.ui.confirmar('Eliminar empresa', `¿Eliminar "${c.businessName}"? Esta acción no se puede deshacer.`)
      .then((ok) => {
        if (!ok) return;
        this.ui.showLoading();
        this.svc.delete(c.idCompany).subscribe({
          next: () => {
            this.ui.hideLoading();
            this.ui.showToast('Empresa eliminada', 'success');
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
