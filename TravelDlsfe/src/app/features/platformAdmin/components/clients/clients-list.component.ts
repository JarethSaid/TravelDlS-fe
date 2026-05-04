import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { Client } from '../../interface/client.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { ClientFormComponent } from './client-form.component';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientFormComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Clientes</h1>
          <p class="page-sub">{{ total() }} clientes registrados</p>
        </div>
        <button class="btn-nuevo" (click)="openCreate()">
          <i class="fa-solid fa-plus"></i> Nuevo Cliente
        </button>
      </div>

      <!-- Filters -->
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
        <select class="filter-select" [(ngModel)]="typeFilter" (ngModelChange)="onSearch()">
          <option value="">Todos los tipos</option>
          <option value="legal">Jurídica</option>
          <option value="natural">Natural</option>
        </select>
      </div>

      <!-- Table -->
      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>Nombre / Empresa</th>
              <th>RUC</th>
              <th>Dirección</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th class="txt-centro">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (clients().length === 0) {
              <tr>
                <td colspan="6" class="tabla-vacia">No se encontraron clientes.</td>
              </tr>
            } @else {
              @for (c of clients(); track c.idClient) {
                <tr>
                  <td class="txt-negrita">{{ c.companyName }}</td>
                  <td>{{ c.ruc }}</td>
                  <td>{{ c.address }}</td>
                  <td>
                    <span [class]="c.typeClient === 'legal' ? 'badge-tipo badge-juridica' : 'badge-tipo badge-natural'">
                      {{ c.typeClient === 'legal' ? 'Jurídica' : 'Natural' }}
                    </span>
                  </td>
                  <td>
                    <span [class]="c.deletedAt ? 'badge-estado badge-inactivo' : 'badge-estado badge-activo'">
                      {{ c.deletedAt ? 'Inactivo' : 'Activo' }}
                    </span>
                  </td>
                  <td>
                    <div class="acciones-celda">
                      <button class="btn-accion btn-editar" title="Ver detalle" (click)="openEdit(c)">
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
      <app-client-form
        [client]="editingClient()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: ``,
})
export class ClientsListComponent implements OnInit {
  private readonly svc = inject(ClientService);
  private readonly ui = inject(InteractionService);

  clients = signal<Client[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = '';
  typeFilter = '';
  showForm = signal(false);
  editingClient = signal<Client | null>(null);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc
      .list({
        page: this.currentPage(),
        perPage: 10,
        search: this.searchTerm || undefined,
        typeClient: this.typeFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.clients.set(res.data);
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
    this.editingClient.set(null);
    this.showForm.set(true);
  }

  openEdit(c: Client): void {
    this.editingClient.set(c);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingClient.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.load();
    this.ui.showToast('Cliente guardado', 'success');
  }

  confirmDelete(c: Client): void {
    this.ui
      .confirmar('Eliminar cliente', `¿Eliminar "${c.companyName}"?`)
      .then((ok) => {
        if (!ok) return;
        this.ui.showLoading();
        this.svc.delete(c.idClient).subscribe({
          next: () => {
            this.ui.hideLoading();
            this.ui.showToast('Cliente eliminado', 'success');
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
