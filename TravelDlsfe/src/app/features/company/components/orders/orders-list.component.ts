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
  selectedAmount?: number;
  customRate?: number;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Pedidos</h1>
          <p class="page-sub">{{ total() }} pedidos registrados</p>
        </div>
      </div>

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
                <th>Acciones</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Conductor</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="7" class="tabla-vacia">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                  </td>
                </tr>
              } @else if (orders().length === 0) {
                <tr>
                  <td colspan="7">
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

                    <td>
                      <button
                        (click)="viewDetails(o)"
                        style="border: none; background: #e0e7ff; color: #3d39af; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;"
                        onmouseover="this.style.backgroundColor='#c7d2fe'"
                        onmouseout="this.style.backgroundColor='#e0e7ff'"
                      >
                        <i class="fa-regular fa-eye"></i>
                        <span>Ver detalles</span>
                      </button>
                    </td>

                    <td>{{ o.client?.companyName ?? 'Cliente #' + o.idClient }}</td>
                    <td>
                      <span [class]="statusBadgeClass(o.status)">{{ statusLabel(o.status) }}</span>
                    </td>
                    <td>{{ o.createdAt | date: 'dd/MM/yyyy' }}</td>

                    <td>
                      @if (o.details && o.details[0] && o.details[0].idDriver) {
                        <span style="font-weight: 500; color: #334155;">{{
                          cleanDriverName(
                            o.details[0]?.driver?.user?.name ||
                              o.details[0]?.driver?.name ||
                              getDriverName(o.details[0].idDriver)
                          )
                        }}</span>
                      } @else if (o.details && o.details[0]) {
                        <div style="display:flex; gap:8px; align-items:center;">
                          <div
                            style="position: relative; display: flex; align-items: center; min-width: 200px;"
                          >
                            <i
                              class="fa-solid fa-user-tie"
                              style="position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none;"
                            ></i>
                            <select
                              [(ngModel)]="o.selectedDriverId"
                              autocomplete="off"
                              style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 10px 14px 10px 38px; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; box-sizing: border-box; background-color: #f8fafc; color: #1e293b; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 12px center; background-repeat: no-repeat; background-size: 18px; transition: all 0.2s;"
                            >
                              <option [ngValue]="undefined" disabled selected>
                                Seleccione Conductor
                              </option>
                              @for (d of drivers(); track d.idDriver) {
                                <option [ngValue]="d.idDriver">
                                  {{ cleanDriverName(d.user?.name || d.name) }}
                                </option>
                              }
                            </select>
                          </div>
                          <button
                            [disabled]="!o.selectedDriverId"
                            (click)="assignDriver(o.idOrder, o.selectedDriverId)"
                            style="padding: 10px 16px; border-radius: 12px; font-weight: 600; font-size: 13px; background: #3d39af; color: white; border: none; display: flex; align-items: center; gap: 6px; cursor: pointer;"
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

                    <td>
                      <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 6px; align-items: center;">
                          <input
                            type="number"
                            min="0"
                            [(ngModel)]="o.customRate"
                            placeholder="Tarifa C$"
                            style="width: 80px; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;"
                          />
                          <button
                            (click)="calculateByRate(o, o.customRate)"
                            style="background: #e2e8f0; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;"
                          >
                            <i class="fa-solid fa-calculator"></i>
                          </button>
                        </div>

                        <div style="display: flex; gap: 6px; align-items: center;">
                          <span style="font-weight: 700; color: #3d39af; font-size: 14px;">
                            Total: {{ o.selectedAmount | currency: 'C$' }}
                          </span>
                          <button
                            (click)="assignPrice(o.idOrder, o.selectedAmount)"
                            [disabled]="!o.selectedAmount"
                            style="background-color: #5fcfa7; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;"
                          >
                            Asignar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (totalPages() > 1) {
          <div class="paginacion-estandar" style="padding: 16px 0;">
            <button
              class="btn-pag"
              [disabled]="currentPage() <= 1"
              (click)="goPage(currentPage() - 1)"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span>Página {{ currentPage() }} de {{ totalPages() }}</span>
            <button
              class="btn-pag"
              [disabled]="currentPage() >= totalPages()"
              (click)="goPage(currentPage() + 1)"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        }
      </div>
    </div>

    @if (showModal() && selectedOrder()) {
      <div
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);"
      >
        <div
          style="background: white; width: 100%; max-width: 600px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; display: flex; flex-direction: column; animation: fadeIn 0.2s ease-out;"
        >
          <div
            style="padding: 20px 24px; border-bottom: 1.5px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;"
          >
            <div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">
                Detalles del Pedido #{{ selectedOrder()?.idOrder }}
              </h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                Registrado el {{ selectedOrder()?.createdAt | date: 'dd/MM/yyyy a las hh:mm a' }}
              </p>
            </div>
            <button
              (click)="closeModal()"
              style="background: #e2e8f0; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; transition: all 0.2s;"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div
            style="padding: 24px; max-height: 70vh; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;"
          >
            <div>
              <h3
                style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;"
              >
                Información del Cliente
              </h3>
              <div
                style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1.5px solid #e2e8f0;"
              >
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">
                  {{ selectedOrder()?.client?.companyName ?? 'Cliente General' }}
                </p>
                @if (selectedOrder()?.client?.ruc) {
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                    <strong>RUC:</strong> {{ selectedOrder()?.client?.ruc }}
                  </p>
                }
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">
                  <strong>Estado actual:</strong>
                  <span
                    [class]="statusBadgeClass(selectedOrder()!.status)"
                    style="margin-left: 6px; display: inline-block;"
                    >{{ statusLabel(selectedOrder()!.status) }}</span
                  >
                </p>
              </div>
            </div>

            <div>
              <h3
                style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;"
              >
                Items del Pedido
              </h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                @if (selectedOrder()?.details && selectedOrder()!.details!.length > 0) {
                  @for (det of selectedOrder()?.details; track $index) {
                    <div
                      style="border: 1.5px solid #e2e8f0; padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"
                    >
                      <div>
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">
                          {{ det.productName ?? det.description ?? 'Servicio de Transporte' }}
                        </p>

                        @if (det.cargoDescription) {
                          <p
                            style="margin: 4px 0 0 0; font-size: 13px; color: #475569; font-style: italic;"
                          >
                            "{{ det.cargoDescription }}"
                          </p>
                        }

                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
                          <span
                            style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #64748b; font-weight: 500;"
                          >
                            <i class="fa-solid fa-cubes" style="margin-right: 4px; font-size: 10px; color: #94a3b8;"></i>
                            Cant: {{ det.quantity ?? 1 }}
                          </span>
                          <span
                            style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #64748b; font-weight: 500;"
                          >
                            <i class="fa-solid fa-weight-hanging" style="margin-right: 4px; font-size: 10px; color: #94a3b8;"></i>
                            Peso: {{ det.unitWeight ?? 'N/A' }}
                          </span>
                          @if (det.typePackaging) {
                            <span
                              style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #64748b; font-weight: 500;"
                            >
                              <i class="fa-solid fa-box" style="margin-right: 4px; font-size: 10px; color: #94a3b8;"></i>
                              {{ det.typePackaging }}
                            </span>
                          }
                        </div>

                        @if (det.deliveryAddress) {
                          <p
                            style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 5px;"
                          >
                            <i class="fa-solid fa-location-dot" style="font-size: 11px; color: #3d39af;"></i>
                            {{ det.deliveryAddress }}
                          </p>
                        }
                      </div>

                      <div style="text-align: right;">
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #3d39af;">
                          C$ {{ det.amount ?? det.price ?? 0 | number: '1.2-2' }}
                        </p>
                      </div>
                    </div>
                  }
                } @else {
                  <p style="margin: 0; font-style: italic; color: #64748b; font-size: 13px;">
                    Este pedido no cuenta con detalles explícitos de items.
                  </p>
                }
              </div>
            </div>
          </div>

          <div
            style="padding: 16px 24px; border-top: 1.5px solid #f1f5f9; display: flex; justify-content: flex-end; background: #f8fafc;"
          >
            <button
              (click)="closeModal()"
              style="background: #3d39af; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    }
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

  // Signals para controlar la visualización del Modal de Detalle
  showModal = signal(false);
  selectedOrder = signal<Order | null>(null);

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
      error: (err) => console.error('Error loading drivers', err),
    });
  }

  load(): void {
    this.loading.set(true);
    let p = new HttpParams().set('page', this.currentPage()).set('perPage', 10);
    if (this.companyId) p = p.set('idCompany', this.companyId);
    if (this.statusFilter) p = p.set('status', this.statusFilter);

    this.orderService.getOrders(p).subscribe({
      next: (res) => {
        let data: Order[] = res.data ?? [];

        // LÓGICA DE CÁLCULO Y GUARDADO AUTOMÁTICO
        data.forEach((o) => {
          const detail = o.details?.[0];
          const hasPrice = o.details && (o.details[0]?.amount || o.details[0]?.price);

          // Si NO tiene precio, lo calculamos y guardamos
          if (!hasPrice && detail) {
            const qty = detail.quantity || 1;
            const weight = Number.parseFloat(String(detail.unitWeight).replace(/[^\d.]/g, '')) || 0;
            const rate = 150.1; // Tu tarifa fija
            const calculatedAmount = rate * qty * weight;

            // 1. Asignamos visualmente
            o.selectedAmount = calculatedAmount;

            // 2. Guardamos automáticamente en backend
            this.orderService.assignPrice(o.idOrder, calculatedAmount).subscribe({
              next: () => console.log(`Precio asignado automáticamente a orden ${o.idOrder}`),
              error: (err) => console.error(`Error guardando precio auto: ${err}`),
            });
          } else {
            o.selectedAmount = hasPrice;
          }
        });

        // Filtrado de búsqueda
        if (this.searchTerm.trim()) {
          const term = this.searchTerm.toLowerCase();
          data = data.filter(
            (o) =>
              String(o.idOrder).includes(term) ||
              o.client?.companyName?.toLowerCase().includes(term),
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

  // Activa el modal y le asigna la orden seleccionada
  viewDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedOrder.set(null);
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
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_proceso: 'En proceso',
      completado: 'Completado',
      cancelado: 'Cancelado',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'badge-resort badge-pendiente',
      confirmado: 'badge-resort badge-confirmada',
      en_proceso: 'badge-resort badge-activa',
      completado: 'badge-resort badge-finalizada',
      cancelado: 'badge-resort badge-cancelada',
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
      },
    });
  }

  assignPrice(idOrder: number, amount?: number): void {
    if (amount === undefined || amount === null) return;

    this.orderService.assignPrice(idOrder, amount).subscribe({
      next: (res) => {
        this.ui.showToast('Precio asignado correctamente', 'success');
        this.load();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  getDriverName(idDriver: number): string {
    const drv = this.drivers().find((d) => d.idDriver === idDriver);
    if (drv) {
      return this.cleanDriverName(drv.user?.name || drv.name || 'Conductor #' + idDriver);
    }
    return 'Conductor asignado';
  }

  cleanDriverName(name: string | undefined | null): string {
    if (!name) return 'Sin nombre';
    return name.replace(/\s*\(.*?\)\s*$/, '').trim();
  }

  calculateByRate(order: Order, rate: number | undefined): void {
    const actualRate = Math.max(0, rate || 0);

    const detail = order.details?.[0];
    if (!detail) return;

    const quantity = Math.max(0, detail.quantity || 1);
    const weight = Math.max(
      0,
      Number.parseFloat(String(detail.unitWeight).replace(/[^\d.]/g, '')) || 0,
    );

    order.selectedAmount = actualRate * quantity * weight;
  }
}
