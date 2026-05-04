import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
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
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="4" class="tabla-vacia"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>
              } @else if (orders().length === 0) {
                <tr>
                  <td colspan="4">
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
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  orders = signal<Order[]>([]);
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
}
