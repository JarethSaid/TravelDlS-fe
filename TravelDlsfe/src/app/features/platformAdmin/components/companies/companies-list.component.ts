import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../service/company.service';
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
        <button class="btn-nuevo" (click)="openCreate()">
          <i class="fa-solid fa-plus"></i> Nueva Empresa
        </button>
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

    <!-- Modal Form -->
    @if (showForm()) {
      <app-company-form
        [company]="editingCompany()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 800;
      color: #1e293b;
    }
    .page-sub {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .btn-nuevo {
      background: #3d39af;
      color: white;
      border: none;
      padding: 11px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: 0.2s;
      white-space: nowrap;
    }
    .btn-nuevo:hover { opacity: 0.88; transform: translateY(-1px); }
    .badge-estado {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .badge-activo { background: #dcfce7; color: #16a34a; }
    .badge-inactivo { background: #fee2e2; color: #dc2626; }
  `,
})
export class CompaniesListComponent implements OnInit {
  private readonly svc = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  companies = signal<Company[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = '';
  showForm = signal(false);
  editingCompany = signal<Company | null>(null);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc
      .list({ page: this.currentPage(), perPage: 10, search: this.searchTerm || undefined })
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
