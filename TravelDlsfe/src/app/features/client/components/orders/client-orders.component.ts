import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../services/client.service';
import { ClientOrder, OrderPaginator } from '../../interface/client.interface';

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="orders-page">
      <div class="page-header">
        <h1>Mis Órdenes</h1>
        <p class="subtitle">Gestiona y consulta tus órdenes de carga</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'all'"
            (click)="applyFilter('all')"
          >Todos</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'pendiente'"
            (click)="applyFilter('pendiente')"
          >Pendientes</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'completada'"
            (click)="applyFilter('completada')"
          >Completadas</button>
        </div>

        <!-- Per page selector -->
        <div class="per-page">
          <label>Mostrar</label>
          <select [value]="perPage" (change)="onPerPageChange($event)">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="empty-card">
          <div class="empty-icon">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <h3>Cargando órdenes…</h3>
        </div>
      } @else if (filteredOrders().length === 0) {
        <!-- Empty state -->
        <div class="empty-card">
          <div class="empty-icon">
            <i class="fa-solid fa-clipboard-list"></i>
          </div>
          <h3>No hay órdenes registradas</h3>
          <p>Cuando crees órdenes, aparecerán aquí para que puedas darles seguimiento.</p>
        </div>
      } @else {
        <!-- Orders table -->
        <div class="table-card">
          <div class="table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th># Orden</th>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Fecha creación</th>
                  <th>Última actualización</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders(); track order.idOrder) {
                  <tr>
                    <td class="order-id">#{{ order.idOrder }}</td>
                    <td>{{ order.company?.businessName ?? 'Sin asignar' }}</td>
                    <td>
                      <span class="status-chip" [class]="'status-chip status-' + order.status">
                        {{ statusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="date-cell">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="date-cell">{{ order.updatedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (meta()) {
            <div class="pagination-bar">
              <span class="page-info">
                Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ meta()!.total }}
              </span>
              <div class="page-buttons">
                <button
                  class="page-btn"
                  [disabled]="meta()!.currentPage <= 1"
                  (click)="goToPage(meta()!.currentPage - 1)"
                >
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="page-current">{{ meta()!.currentPage }} / {{ meta()!.lastPage }}</span>
                <button
                  class="page-btn"
                  [disabled]="meta()!.currentPage >= meta()!.lastPage"
                  (click)="goToPage(meta()!.currentPage + 1)"
                >
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .orders-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: #1e293b;
      font-weight: 700;
    }

    .page-header .subtitle {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .filters-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .filter-tabs {
      display: flex;
      gap: 6px;
      background: white;
      padding: 4px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .tab {
      padding: 8px 18px;
      border: none;
      background: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .tab:hover {
      color: #1e293b;
      background: #f1f5f9;
    }

    .tab--active {
      background: #3d39af !important;
      color: white !important;
    }

    .per-page {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }

    .per-page select {
      padding: 6px 10px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      font-family: inherit;
      background: white;
      color: #1e293b;
      cursor: pointer;
      outline: none;
    }

    .per-page select:focus {
      border-color: #3d39af;
    }

    .empty-card {
      background: white;
      border-radius: 16px;
      padding: 60px 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ede9fe;
      display: grid;
      place-items: center;
      font-size: 28px;
      color: #6366f1;
      margin-bottom: 20px;
    }

    .empty-card h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .empty-card p {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
      max-width: 360px;
      line-height: 1.6;
    }

    .table-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .orders-table th {
      text-align: left;
      padding: 14px 16px;
      font-weight: 600;
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .orders-table td {
      padding: 14px 16px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .orders-table tbody tr {
      transition: background 0.15s;
    }

    .orders-table tbody tr:hover {
      background: #f8fafc;
    }

    .order-id {
      font-weight: 600;
      color: #3d39af;
    }

    .date-cell {
      color: #64748b;
      font-size: 13px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-pendiente {
      background: #fef3c7;
      color: #d97706;
    }

    .status-completada {
      background: #dcfce7;
      color: #16a34a;
    }

    .status-cancelada {
      background: #fee2e2;
      color: #dc2626;
    }

    .status-en_proceso {
      background: #dbeafe;
      color: #2563eb;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-info {
      font-size: 13px;
      color: #64748b;
    }

    .page-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #64748b;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 12px;
      transition: all 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      border-color: #3d39af;
      color: #3d39af;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-current {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    @media (max-width: 600px) {
      .filters-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .per-page {
        justify-content: flex-end;
      }
    }
  `]
})
export class ClientOrdersComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);

  readonly loading = signal(true);
  readonly allOrders = signal<ClientOrder[]>([]);
  readonly filteredOrders = signal<ClientOrder[]>([]);
  readonly meta = signal<OrderPaginator['meta'] | null>(null);

  activeFilter = 'all';
  perPage = 10;
  currentPage = 1;

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    const u = this.auth.user();
    if (!u?.idClient) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.clientService.getOrders({
      idClient: u.idClient,
      page: this.currentPage,
      perPage: this.perPage,
    }).subscribe({
      next: (res) => {
        this.allOrders.set(res.data);
        this.meta.set(res.meta);
        this.applyFilterLocal();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilterLocal();
  }

  private applyFilterLocal(): void {
    const all = this.allOrders();
    if (this.activeFilter === 'all') {
      this.filteredOrders.set(all);
    } else {
      this.filteredOrders.set(all.filter(o => o.status === this.activeFilter));
    }
  }

  onPerPageChange(event: Event): void {
    this.perPage = +(event.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.loadOrders();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  rangeStart(): number {
    const m = this.meta();
    if (!m) return 0;
    return (m.currentPage - 1) * m.perPage + 1;
  }

  rangeEnd(): number {
    const m = this.meta();
    if (!m) return 0;
    return Math.min(m.currentPage * m.perPage, m.total);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      completada: 'Completada',
      cancelada: 'Cancelada',
      en_proceso: 'En proceso',
    };
    return map[status] ?? status;
  }
}
