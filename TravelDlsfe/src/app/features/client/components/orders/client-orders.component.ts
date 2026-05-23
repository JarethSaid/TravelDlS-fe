import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../services/client.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { ClientOrder, OrderPaginator, Company, OrderDetailDraft, PACKAGING_TYPES } from '../../interface/client.interface';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="orders-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Nueva Orden</h1>
          <p class="subtitle">Selecciona una empresa para realizar tu orden</p>
        </div>
      </div>

      <!-- Search Companies -->
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder="Buscar empresa por nombre o RUC…"
          [ngModel]="searchTerm"
          (ngModelChange)="onSearch($event)"
        />
      </div>

      <!-- Loading Companies -->
      @if (loadingCompanies()) {
        <div class="companies-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Cargando empresas…</span>
        </div>
      } @else if (companies().length === 0) {
        <div class="companies-empty">
          <i class="fa-solid fa-building-circle-xmark"></i>
          <p>No se encontraron empresas</p>
        </div>
      } @else {
        <!-- Company Cards Grid -->
        <div class="companies-grid">
          @for (company of companies(); track company.idCompany) {
            <div class="company-card" (click)="openOrderModal(company)">
              <div class="company-card-image">
                @if (company.photoUrl) {
                  <img [src]="company.photoUrl" [alt]="company.businessName" />
                } @else {
                  <div class="company-card-placeholder">
                    <i class="fa-solid fa-building"></i>
                  </div>
                }
              </div>
              <div class="company-card-content">
                <h3>{{ company.businessName }}</h3>
                <p class="company-ruc">RUC: {{ company.ruc }}</p>
                
                <button class="btn-card-action">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ═══════════ ORDER CREATION MODAL ═══════════ -->
      @if (selectedCompanyForOrder()) {
        <div class="custom-modal-overlay" (click)="closeOrderModal()"></div>
        <div class="custom-modal custom-modal--wide">
          <!-- Header -->
          <div class="custom-modal-header">
            <div>
              <h2>Crear nueva orden</h2>
              <p class="modal-subtitle">{{ selectedCompanyForOrder()!.businessName }} · RUC: {{ selectedCompanyForOrder()!.ruc }}</p>
            </div>
            <button class="btn-close-modal" (click)="closeOrderModal()"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Body -->
          <div class="custom-modal-body modal-body-scroll">
            <!-- ── Formulario de detalle ── -->
            <div class="detail-form-section">
              <h3 class="section-title"><i class="fa-solid fa-box-open"></i> Agregar detalle de carga</h3>

              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label for="cargoDesc">Descripción de carga *</label>
                  <input id="cargoDesc" type="text" [(ngModel)]="draftDetail.cargoDescription" placeholder="Ej: Harina de trigo, cemento…" maxlength="255" />
                </div>

                <div class="form-group">
                  <label for="unitWeight">Peso / Unidad *</label>
                  <input id="unitWeight" type="text" [(ngModel)]="draftDetail.unitWeight" placeholder="Ej: 50 kg, 1 Ton" maxlength="50" />
                </div>

                <div class="form-group">
                  <label for="typePackaging">Tipo empaque *</label>
                  <select id="typePackaging" [(ngModel)]="draftDetail.typePackaging">
                    @for (pt of packagingTypes; track pt.value) {
                      <option [value]="pt.value">{{ pt.label }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label for="deliveryAddr">Dirección de entrega *</label>
                  <input id="deliveryAddr" type="text" [(ngModel)]="draftDetail.deliveryAddress" placeholder="Calle, número, ciudad…" maxlength="255" />
                </div>
              </div>

              <button class="btn-add-detail" (click)="addDetailToCart()" [disabled]="!isDetailValid()">
                <i class="fa-solid fa-plus"></i> Agregar al carrito
              </button>
            </div>

            <!-- ── Lista de detalles (carrito) ── -->
            @if (cartDetails().length > 0) {
              <div class="cart-section">
                <h3 class="section-title"><i class="fa-solid fa-cart-shopping"></i> Detalles de la orden ({{ cartDetails().length }})</h3>
                <div class="cart-list">
                  @for (item of cartDetails(); track $index) {
                    <div class="cart-item">
                      <div class="cart-item-info">
                        <span class="cart-item-number">{{ $index + 1 }}</span>
                        <div class="cart-item-details">
                          <strong>{{ item.cargoDescription }}</strong>
                          <span class="cart-item-meta">
                            {{ item.unitWeight }} · {{ getPackagingLabel(item.typePackaging) }}
                          </span>
                          <span class="cart-item-address"><i class="fa-solid fa-location-dot"></i> {{ item.deliveryAddress }}</span>
                        </div>
                      </div>
                      <button class="btn-remove-detail" (click)="removeFromCart($index)" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ── Carrito vacío ── -->
            @if (cartDetails().length === 0) {
              <div class="cart-empty">
                <i class="fa-solid fa-cart-plus"></i>
                <p>Agrega al menos un detalle de carga para crear la orden</p>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="custom-modal-footer">
            <button class="btn-cancel" (click)="closeOrderModal()" [disabled]="creatingOrder()">Cancelar</button>
            <button class="btn-confirm" (click)="executeOrder()" [disabled]="creatingOrder() || cartDetails().length === 0">
              @if (creatingOrder()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Creando...
              } @else {
                <i class="fa-solid fa-check"></i> Confirmar orden ({{ cartDetails().length }})
              }
            </button>
          </div>
        </div>
      }

      <div class="page-header section-spacing">
        <div class="header-left">
          <h1>Mis Órdenes Históricas</h1>
          <p class="subtitle">Gestiona y consulta tus órdenes de carga anteriores</p>
        </div>
      </div>

      <!-- ===== FILTERS ===== -->
      <div class="filters-bar">
          <div class="filter-tabs">
            <button class="tab" [class.tab--active]="activeFilter === 'all'" (click)="applyFilter('all')">Todos</button>
            <button class="tab" [class.tab--active]="activeFilter === 'pendiente'" (click)="applyFilter('pendiente')">Pendientes</button>
            <button class="tab" [class.tab--active]="activeFilter === 'completada'" (click)="applyFilter('completada')">Completadas</button>
          </div>
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
            <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <h3>Cargando órdenes…</h3>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="empty-card">
            <div class="empty-icon"><i class="fa-solid fa-clipboard-list"></i></div>
            <h3>No hay órdenes registradas</h3>
            <p>Cuando crees órdenes, aparecerán aquí para que puedas darles seguimiento.</p>
          </div>
        } @else {
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

            @if (meta()) {
              <div class="pagination-bar">
                <span class="page-info">Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ meta()!.total }}</span>
                <div class="page-buttons">
                  <button class="page-btn" [disabled]="meta()!.currentPage <= 1" (click)="goToPage(meta()!.currentPage - 1)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <span class="page-current">{{ meta()!.currentPage }} / {{ meta()!.lastPage }}</span>
                  <button class="page-btn" [disabled]="meta()!.currentPage >= meta()!.lastPage" (click)="goToPage(meta()!.currentPage + 1)">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        }
    </div>
  `,
  styleUrl: './client-orders.component.css'
})
export class ClientOrdersComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly ui = inject(InteractionService);

  readonly loading = signal(true);
  readonly allOrders = signal<ClientOrder[]>([]);
  readonly filteredOrders = signal<ClientOrder[]>([]);
  readonly meta = signal<OrderPaginator['meta'] | null>(null);

  // Company picker state
  readonly loadingCompanies = signal(false);
  readonly companies = signal<Company[]>([]);
  readonly selectedCompanyForOrder = signal<Company | null>(null);
  readonly creatingOrder = signal(false);
  searchTerm = '';
  private searchTimeout: any;

  // Cart / detail draft
  readonly cartDetails = signal<OrderDetailDraft[]>([]);
  readonly packagingTypes = PACKAGING_TYPES;
  draftDetail: OrderDetailDraft = this.emptyDraft();

  activeFilter = 'all';
  perPage = 10;
  currentPage = 1;

  ngOnInit(): void {
    this.loadOrders();
    this.loadCompanies();
  }

  /* ── Orders ── */
  private loadOrders(): void {
    const u = this.auth.user();
    if (!u?.idClient) { this.loading.set(false); return; }
    this.loading.set(true);
    this.clientService.getOrders({ idClient: u.idClient, page: this.currentPage, perPage: this.perPage }).subscribe({
      next: (res) => { this.allOrders.set(res.data); this.meta.set(res.meta); this.applyFilterLocal(); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(filter: string): void { this.activeFilter = filter; this.applyFilterLocal(); }

  private applyFilterLocal(): void {
    const all = this.allOrders();
    this.filteredOrders.set(this.activeFilter === 'all' ? all : all.filter(o => o.status === this.activeFilter));
  }

  onPerPageChange(event: Event): void { this.perPage = +(event.target as HTMLSelectElement).value; this.currentPage = 1; this.loadOrders(); }
  goToPage(page: number): void { this.currentPage = page; this.loadOrders(); }
  rangeStart(): number { const m = this.meta(); return m ? (m.currentPage - 1) * m.perPage + 1 : 0; }
  rangeEnd(): number { const m = this.meta(); return m ? Math.min(m.currentPage * m.perPage, m.total) : 0; }
  statusLabel(status: string): string {
    const map: Record<string, string> = { pendiente: 'Pendiente', completada: 'Completada', cancelada: 'Cancelada', en_proceso: 'En proceso' };
    return map[status] ?? status;
  }

  private loadCompanies(search?: string): void {
    this.loadingCompanies.set(true);
    this.clientService.getCompanies({ page: 1, perPage: 50, search }).subscribe({
      next: (res) => { this.companies.set(res.data); this.loadingCompanies.set(false); },
      error: () => { this.companies.set([]); this.loadingCompanies.set(false); },
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadCompanies(term || undefined), 350);
  }

  /* ── Modal ── */
  openOrderModal(company: Company): void {
    this.selectedCompanyForOrder.set(company);
    this.cartDetails.set([]);
    this.draftDetail = this.emptyDraft();
  }

  closeOrderModal(): void {
    if (!this.creatingOrder()) {
      this.selectedCompanyForOrder.set(null);
      this.cartDetails.set([]);
      this.draftDetail = this.emptyDraft();
    }
  }

  /* ── Detail Draft / Cart ── */
  private emptyDraft(): OrderDetailDraft {
    return { cargoDescription: '', amount: 1, unitWeight: '', deliveryAddress: '', typePackaging: 'pallet' };
  }

  isDetailValid(): boolean {
    const d = this.draftDetail;
    return d.cargoDescription.trim().length >= 3
      && d.unitWeight.trim().length > 0
      && d.deliveryAddress.trim().length >= 5;
  }

  addDetailToCart(): void {
    if (!this.isDetailValid()) return;
    this.cartDetails.update(list => [
      ...list,
      {
        cargoDescription: this.draftDetail.cargoDescription.trim(),
        amount: 1,
        unitWeight: this.draftDetail.unitWeight.trim(),
        deliveryAddress: this.draftDetail.deliveryAddress.trim(),
        typePackaging: this.draftDetail.typePackaging,
      },
    ]);
    this.draftDetail = this.emptyDraft();
  }

  removeFromCart(index: number): void {
    this.cartDetails.update(list => list.filter((_, i) => i !== index));
  }

  getPackagingLabel(value: string): string {
    return this.packagingTypes.find(p => p.value === value)?.label ?? value;
  }

  /* ── Execute Order + Details ── */
  executeOrder(): void {
    const u = this.auth.user();
    const company = this.selectedCompanyForOrder();
    const details = this.cartDetails();
    if (!company || details.length === 0) return;

    if (!u?.idClient) {
      this.ui.mostrarError('Tu cuenta de usuario no tiene un perfil de Cliente (idClient) asociado. Por favor, actualiza tu perfil antes de crear órdenes.');
      return;
    }

    this.creatingOrder.set(true);

    // 1) Crear la cabecera de la orden
    this.clientService.createOrder({ idClient: u.idClient, idCompany: company.idCompany }).subscribe({
      next: (order) => {
        // 2) Crear todos los detalles en paralelo
        const detailRequests = details.map(d =>
          this.clientService.createOrderDetail({
            idOrder: order.idOrder,
            cargoDescription: d.cargoDescription,
            amount: d.amount,
            unitWeight: d.unitWeight,
            deliveryAddress: d.deliveryAddress,
            typePackaging: d.typePackaging,
          })
        );

        forkJoin(detailRequests).subscribe({
          next: () => {
            this.creatingOrder.set(false);
            this.selectedCompanyForOrder.set(null);
            this.cartDetails.set([]);
            this.draftDetail = this.emptyDraft();
            this.ui.showToast('Orden creada exitosamente con ' + details.length + ' detalle(s)', 'success');
            this.currentPage = 1;
            this.loadOrders();
          },
          error: (err) => {
            this.creatingOrder.set(false);
            this.ui.mostrarError(err);
          },
        });
      },
      error: (err) => {
        this.creatingOrder.set(false);
        this.ui.mostrarError(err);
      },
    });
  }
}
