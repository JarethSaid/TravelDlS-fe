import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { CompanyDriverService, Driver } from '../../services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface Order {
  idOrder: number;
  idClient: number;
  idCompany: number;
  status: string;
  deletedAt: string | null;
  createdAt: string;
  client?: { companyName: string; ruc: string };
  details?: any[];
  selectedDriverId?: number;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Pedidos</h1>
          <p class="page-sub">{{ total() }} pedidos registrados</p>
        </div>
      </div>

      <!-- Card -->
      <div class="company-content-card">
        <div class="company-toolbar">
          <div class="company-search-box">
            <i class="fa-solid fa-magnifying-glass company-search-icon"></i>
            <input
              class="company-search-input"
              type="text"
              placeholder="Buscar pedido…"
              [(ngModel)]="searchTerm"
              (input)="onSearch()"
            />
          </div>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onSearch()">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div class="tabla-contenedor" style="border-radius:0; border:none; box-shadow:none;">
          <table class="tabla-resort">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Conductor</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="5" class="tabla-vacia"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>
              } @else if (orders().length === 0) {
                <tr>
                  <td colspan="5">
                    <div class="empty-state-company">
                      <div class="empty-state-icon"><i class="fa-solid fa-box"></i></div>
                      <p class="empty-state-text">No hay pedidos registrados</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (o of orders(); track o.idOrder) {
                  <tr>
                    <td class="txt-negrita">#{{ o.idOrder }}</td>
                    <td>{{ o.client?.companyName ?? ('Cliente #' + o.idClient) }}</td>
                    <td><span [class]="statusBadgeClass(o.status)">{{ statusLabel(o.status) }}</span></td>
                    <td>{{ o.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td>
                      @if (o.details && o.details[0] && o.details[0].idDriver) {
                        <span>{{ o.details[0]?.driver?.user?.name || o.details[0]?.driver?.name || getDriverName(o.details[0].idDriver) }}</span>
                      } @else if (o.details && o.details[0]) {
                        <div style="display:flex; gap:8px; align-items:center;">
                          <div style="position: relative; display: flex; align-items: center; min-width: 220px;">
                            <i class="fa-solid fa-user-tie" style="position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none;"></i>
                            <select
                              [(ngModel)]="o.selectedDriverId"
                              style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 10px 14px 10px 38px; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; box-sizing: border-box; background-color: #f8fafc; color: #1e293b; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 12px center; background-repeat: no-repeat; background-size: 18px; transition: all 0.2s;"
                              onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.15)'"
                              onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'"
                            >
                              <option [ngValue]="undefined" disabled selected>Seleccione Conductor</option>
                              @for (d of drivers(); track d.idDriver) {
                                <option [ngValue]="d.idDriver">{{ d.user?.name || d.name || 'Sin nombre (' + d.license + ')' }}</option>
                              }
                            </select>
                          </div>
                          <button
                            [disabled]="!o.selectedDriverId"
                            (click)="assignDriver(o.idOrder, o.selectedDriverId)"
                            style="padding: 10px 16px; border-radius: 12px; font-weight: 600; font-size: 13px; background: #3d39af; color: white; border: none; display: flex; align-items: center; gap: 6px; transition: all 0.2s;"
                            onmouseover="if(!this.disabled){this.style.backgroundColor='#2d299f'; this.style.boxShadow='0 4px 12px rgba(61, 57, 175, 0.2)'}"
                            onmouseout="if(!this.disabled){this.style.backgroundColor='#3d39af'; this.style.boxShadow='none'}"
                            [style.opacity]="!o.selectedDriverId ? '0.5' : '1'"
                            [style.cursor]="!o.selectedDriverId ? 'not-allowed' : 'pointer'"
                          >
                            <i class="fa-solid fa-check"></i> Asignar
                          </button>
                        </div>
                      } @else {
                        <span style="color:#6c757d; font-style:italic;">Sin detalles</span>
                      }
                    </td>
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
export class OrdersListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly driverService = inject(CompanyDriverService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  orders = signal<Order[]>([]);
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
    if (this.companyId) {
      this.loadDrivers();
    }
  }

  loadDrivers(): void {
    let p = new HttpParams().set('perPage', 100);
    if (this.companyId) p = p.set('idCompany', this.companyId);
    this.driverService.getDrivers(p).subscribe({
      next: (res) => this.drivers.set(res.data || []),
      error: (err) => console.error('Error loading drivers', err)
    });
  }

  load(): void {
    this.loading.set(true);
    let p = new HttpParams()
      .set('page', this.currentPage())
      .set('perPage', 10);
    if (this.companyId)   p = p.set('idCompany', this.companyId);
    if (this.statusFilter) p = p.set('status', this.statusFilter);

    this.orderService.getOrders(p).subscribe({
      next: (res) => {
        let data: Order[] = res.data ?? [];
        // Client-side filter by searchTerm on order id or client name
        if (this.searchTerm.trim()) {
          const term = this.searchTerm.toLowerCase();
          data = data.filter(
            (o) =>
              String(o.idOrder).includes(term) ||
              o.client?.companyName?.toLowerCase().includes(term)
          );
        }
        this.orders.set(data);
        this.total.set(res.meta?.total ?? data.length);
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
      pendiente:  'Pendiente',
      confirmado: 'Confirmado',
      en_proceso: 'En proceso',
      completado: 'Completado',
      cancelado:  'Cancelado',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pendiente:  'badge-resort badge-pendiente',
      confirmado: 'badge-resort badge-confirmada',
      en_proceso: 'badge-resort badge-activa',
      completado: 'badge-resort badge-finalizada',
      cancelado:  'badge-resort badge-cancelada',
    };
    return map[status] ?? 'badge-resort badge-pendiente';
  }

  assignDriver(idOrder: number, idDriver?: number): void {
    if (!idDriver) return;
    this.orderService.assignDriver(idOrder, idDriver).subscribe({
      next: (res) => {
        this.ui.showToast('Conductor asignado correctamente', 'success');
        this.load();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      }
    });
  }

  getDriverName(idDriver: number): string {
    const drv = this.drivers().find(d => d.idDriver === idDriver);
    if (drv) {
      return drv.user?.name || drv.name || ('Conductor #' + idDriver);
    }
    return 'Conductor asignado';
  }
}
