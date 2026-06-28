import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { CompanyDriverService, Driver } from '../../services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { interval, Subscription } from 'rxjs';

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
  editingDriver?: boolean;
  newDriverId?: number;
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
        <div class="company-toolbar" style="margin-bottom: 20px;">
          <div class="company-search-box" style="flex: 1; max-width: 700px;">
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
            <option value="esperando_aprobacion">Esperando aprobación</option>
            <option value="aceptado">Aceptado</option>
            <option value="en_transito">En tránsito</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
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
                  <tr [class.company-order-row--updated]="updatedOrderIds().has(o.idOrder)">
                    <td class="txt-negrita">#{{ o.idOrder }}</td>

                    <td>
                      <button
                        class="company-inline-action company-inline-action--details"
                        type="button"
                        (click)="viewDetails(o)"
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
                      @if (o.details && o.details[0] && o.details[0].idDriver && !o.editingDriver) {
                        <!-- Conductor ya asignado: mostrar nombre + botón editar -->
                        <div class="order-driver-assigned">
                          <span class="order-driver-name">{{
                            cleanDriverName(
                              o.details[0]?.driver?.user?.name ||
                                o.details[0]?.driver?.name ||
                                getDriverName(o.details[0].idDriver)
                            )
                          }}</span>
                          @if (!isDriverLocked(o)) {
                            <button
                              class="order-driver-edit"
                              type="button"
                              (click)="startEditDriver(o)"
                              title="Cambiar conductor"
                            >
                              <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                          }
                        </div>
                      } @else if (o.details && o.details[0] && (o.editingDriver || !o.details[0].idDriver)) {
                        <!-- Selector para asignar / reasignar conductor -->
                        @if (isDriverLocked(o)) {
                          <span class="order-muted-text">Asignación bloqueada</span>
                        } @else {
                          <div class="order-driver-card">
                            <h4 class="order-driver-card__title">
                              {{ o.editingDriver ? 'Nuevo conductor' : 'Asignar conductor' }}
                            </h4>

                            <div class="order-driver-select-wrap">
                              <i class="fa-solid fa-user-tie order-driver-select-icon"></i>
                              <select
                                class="order-driver-select"
                                [(ngModel)]="o.newDriverId"
                                autocomplete="off"
                              >
                                <option [ngValue]="undefined" disabled>
                                  {{
                                    o.editingDriver ? 'Seleccione nuevo conductor' : 'Seleccione conductor'
                                  }}
                                </option>
                                @for (d of drivers(); track d.idDriver) {
                                  <option [ngValue]="d.idDriver">
                                    {{ cleanDriverName(d.user?.name || d.name) }}
                                  </option>
                                }
                              </select>
                            </div>

                            <div class="order-driver-card__actions">
                              <button
                                class="order-driver-action order-driver-action--primary"
                                type="button"
                                [disabled]="!o.newDriverId"
                                (click)="confirmDriverEdit(o)"
                              >
                                <i class="fa-solid fa-check"></i>
                                {{ o.editingDriver ? 'Cambiar' : 'Asignar' }}
                              </button>
                              @if (o.editingDriver) {
                                <button
                                  class="order-driver-action order-driver-action--secondary"
                                  type="button"
                                  (click)="cancelEditDriver(o)"
                                >
                                  <i class="fa-solid fa-xmark"></i> Cancelar
                                </button>
                              }
                            </div>
                          </div>
                        }
                      } @else {
                        <span class="order-muted-text">Sin detalles</span>
                      }
                    </td>

                    <td style="min-width: 150px;">
                      @let priceLocked = isPriceLocked(o);
                      <div
                        style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;"
                      >
                        @if (
                          o.selectedAmount ||
                          (o.details && o.details[0] && (o.details[0].amount || o.details[0].price))
                        ) {
                          <div style="display: flex; flex-direction: column;">
                            <span
                              style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;"
                              >Precio asignado</span
                            >
                            <span style="font-weight: 800; color: #3d39af; font-size: 15px;">
                              C$
                              {{
                                o.selectedAmount ||
                                  (o.details &&
                                    o.details[0] &&
                                    (o.details[0].amount || o.details[0].price))
                                  | number: '1.2-2' : 'en-US'
                              }}
                            </span>
                          </div>
                        } @else {
                          <span style="color: #64748b; font-size: 13px; font-style: italic;"
                            >Sin asignar</span
                          >
                        }

                        <button
                          class="company-inline-action company-inline-action--price"
                          type="button"
                          (click)="openPriceModal(o)"
                          [disabled]="priceLocked"
                        >
                          <i class="fa-solid fa-calculator"></i>
                          {{
                            o.selectedAmount ||
                            (o.details &&
                              o.details[0] &&
                              (o.details[0].amount || o.details[0].price))
                              ? 'Editar precio'
                              : 'Asignar precio'
                          }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="paginacion-estandar company-list-pagination">
          <span class="pag-rango">{{ rangeLabel() }}</span>
          <div class="pag-controles">
            <button
              class="btn-pag"
              [disabled]="currentPage() <= 1 || loading()"
              (click)="goPage(1)"
            >
              <i class="fa-solid fa-angles-left"></i>
            </button>
            <button
              class="btn-pag"
              [disabled]="currentPage() <= 1 || loading()"
              (click)="goPage(currentPage() - 1)"
            >
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
            <button
              class="btn-pag"
              [disabled]="currentPage() >= totalPages() || loading()"
              (click)="goPage(currentPage() + 1)"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button
              class="btn-pag"
              [disabled]="currentPage() >= totalPages() || loading()"
              (click)="goPage(totalPages())"
            >
              <i class="fa-solid fa-angles-right"></i>
            </button>
          </div>
        </div>
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
                            <i
                              class="fa-solid fa-cubes"
                              style="margin-right: 4px; font-size: 10px; color: #94a3b8;"
                            ></i>
                            Cant: {{ det.quantity ?? 1 }}
                          </span>
                          <span
                            style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #64748b; font-weight: 500;"
                          >
                            <i
                              class="fa-solid fa-weight-hanging"
                              style="margin-right: 4px; font-size: 10px; color: #94a3b8;"
                            ></i>
                            Peso: {{ det.unitWeight ?? 'N/A' }}
                          </span>
                          @if (det.typePackaging) {
                            <span
                              style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #64748b; font-weight: 500;"
                            >
                              <i
                                class="fa-solid fa-box"
                                style="margin-right: 4px; font-size: 10px; color: #94a3b8;"
                              ></i>
                              {{ det.typePackaging }}
                            </span>
                          }
                        </div>

                        @if (det.deliveryAddress) {
                          <p
                            style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 5px;"
                          >
                            <i
                              class="fa-solid fa-location-dot"
                              style="font-size: 11px; color: #3d39af;"
                            ></i>
                            {{ det.deliveryAddress }}
                          </p>
                        }
                      </div>

                      <div style="text-align: right;">
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #3d39af;">
                          C$ {{ selectedOrder()?.selectedAmount || det.amount || det.price || 0 | number: '1.2-2' : 'en-US' }}
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

    @if (showPriceModal() && priceOrder()) {
      <div
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);"
      >
        <div
          style="background: white; width: 100%; max-width: 480px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; display: flex; flex-direction: column; animation: fadeIn 0.2s ease-out;"
        >
          <div
            style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #ffffff;"
          >
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">
              Asignar Precio
            </h2>
            <button
              (click)="closePriceModal()"
              style="background: #e2e8f0; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; transition: all 0.2s;"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div
            style="padding: 24px; display: flex; flex-direction: column; gap: 24px; background: #ffffff;"
          >
            <p
              style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.5; background: #f0fdf4; padding: 12px 16px; border-radius: 10px; border-left: 4px solid #10b981;"
            >
              <i class="fa-solid fa-circle-info" style="color: #10b981; margin-right: 8px;"></i>
              Ingresa la <strong>tarifa base</strong>. El sistema la multiplicará automáticamente
              por el <strong>peso</strong> y la <strong>cantidad</strong> que ya están registrados
              en este pedido.
            </p>

            <div
              style="background: #f8fafc; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 20px; border: 1px solid #e2e8f0; position: relative;"
            >
              <div
                style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"
              >
                <!-- Tarifa (Editable) -->
                <div
                  style="display: flex; flex-direction: column; flex: 2.2; min-width: 160px; gap: 8px; position: relative; z-index: 2;"
                >
                  <label
                    style="font-size: 13px; font-weight: 800; color: #3d39af; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;"
                  >
                    <i class="fa-solid fa-pencil" style="font-size: 11px;"></i> Tu Tarifa (C$)
                  </label>
                  <div style="position: relative;">
                    <span
                      style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #3d39af; font-size: 18px; font-weight: 800;"
                      >C$</span
                    >
                    <input
                      type="number"
                      min="0"
                      [(ngModel)]="priceOrder()!.customRate"
                      (ngModelChange)="calculateByRate(priceOrder()!, $event)"
                      placeholder="Ej. 600"
                      style="width: 100%; padding: 16px 14px 16px 50px; border-radius: 12px; border: 2px solid #a5b4fc; font-family: inherit; font-size: 20px; font-weight: 800; color: #3d39af; outline: none; box-sizing: border-box; background: white; box-shadow: 0 4px 6px -1px rgba(61, 57, 175, 0.1);"
                      onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.2)';"
                      onblur="if(!this.value) { this.style.borderColor='#a5b4fc'; } this.style.boxShadow='0 4px 6px -1px rgba(61, 57, 175, 0.1)';"
                    />
                  </div>
                </div>

                <span style="color: #94a3b8; font-size: 20px; font-weight: 400; margin-top: 24px;"
                  >×</span
                >

                <!-- Peso (Lectura) -->
                <div style="display: flex; flex-direction: column; flex: 1; gap: 8px;">
                  <label
                    style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;"
                    >Peso</label
                  >
                  <div
                    style="background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 12px; text-align: center; font-size: 16px; font-weight: 700; color: #64748b; cursor: not-allowed;"
                    title="Valor fijo del pedido"
                  >
                    {{ getOrderWeight(priceOrder()!) }}
                  </div>
                </div>

                <span style="color: #94a3b8; font-size: 20px; font-weight: 400; margin-top: 24px;"
                  >×</span
                >

                <!-- Cantidad (Lectura) -->
                <div style="display: flex; flex-direction: column; flex: 1; gap: 8px;">
                  <label
                    style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;"
                    >Cant.</label
                  >
                  <div
                    style="background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 12px; text-align: center; font-size: 16px; font-weight: 700; color: #64748b; cursor: not-allowed;"
                    title="Valor fijo del pedido"
                  >
                    {{ getOrderQuantity(priceOrder()!) }}
                  </div>
                </div>
              </div>

              <hr style="border: none; border-top: 2px dashed #cbd5e1; margin: 0;" />

              <div
                style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;"
              >
                <span
                  style="font-size: 14px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;"
                  >Monto Total</span
                >
                <span style="font-weight: 800; color: #10b981; font-size: 26px;">
                  C$
                  {{
                    priceOrder()!.selectedAmount
                      ? (priceOrder()!.selectedAmount | number: '1.2-2' : 'en-US')
                      : '0.00'
                  }}
                </span>
              </div>
            </div>
          </div>

          <div
            style="padding: 20px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; background: #ffffff;"
          >
            <button
              (click)="closePriceModal()"
              style="background: white; color: #475569; border: 1.5px solid #cbd5e1; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.background='#f8fafc'"
              onmouseout="this.style.background='white'"
            >
              Cancelar
            </button>
            <button
              (click)="confirmPrice()"
              [disabled]="!priceOrder()!.selectedAmount"
              style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;"
              [style.opacity]="!priceOrder()!.selectedAmount ? '0.5' : '1'"
              [style.cursor]="!priceOrder()!.selectedAmount ? 'not-allowed' : 'pointer'"
              onmouseover="if(!this.disabled) { this.style.backgroundColor='#059669'; }"
              onmouseout="if(!this.disabled) { this.style.backgroundColor='#10b981'; }"
            >
              <i class="fa-solid fa-check"></i> Confirmar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .company-inline-action {
      min-height: 36px;
      border: none;
      border-radius: 10px;
      padding: 8px 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      font-size: 13px;
      line-height: 1;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
      white-space: nowrap;
    }

    .company-inline-action--details {
      background: #e0e7ff;
      color: #3d39af;
    }

    .company-inline-action--details:hover {
      background: #c7d2fe;
    }

    .company-inline-action--price {
      background: #10b981;
      color: white;
      border-radius: 8px;
      padding-inline: 12px;
    }

    .company-inline-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .order-driver-assigned {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .order-driver-card {
      background: #ffffff;
      border: 1.5px solid #dbeafe;
      border-radius: 14px;
      padding: 14px 16px 16px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      min-width: 250px;
      max-width: 290px;
      box-shadow: 0 2px 8px rgba(61, 57, 175, 0.06);
    }

    .order-driver-card__title {
      margin: 0;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3d39af;
      line-height: 1.2;
    }

    .order-driver-card__actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .order-driver-name {
      color: #334155;
      font-weight: 600;
      line-height: 1.35;
    }

    .order-driver-edit {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: #3d39af;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
      flex: 0 0 auto;
    }

    .order-driver-edit:hover {
      background: #e0e7ff;
      border-color: #a5b4fc;
    }

    .order-driver-select-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .order-driver-select-icon {
      position: absolute;
      left: 14px;
      color: #3d39af;
      font-size: 15px;
      pointer-events: none;
      z-index: 1;
    }

    .order-driver-select {
      width: 100%;
      min-height: 44px;
      border-radius: 12px;
      border: 1.5px solid #a5b4fc;
      padding: 10px 40px 10px 42px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.2;
      font-weight: 700;
      cursor: pointer;
      box-sizing: border-box;
      background-color: #ffffff;
      color: #1e293b;
      appearance: none;
      -webkit-appearance: none;
      background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%2364748b%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E');
      background-position: right 14px center;
      background-repeat: no-repeat;
      background-size: 18px;
      transition: border-color 0.2s, box-shadow 0.2s;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .order-driver-select:focus {
      outline: none;
      border-color: #3d39af;
      background-color: white;
      box-shadow: 0 0 0 3px rgba(61, 57, 175, 0.08);
    }

    .order-driver-action {
      min-height: 40px;
      border-radius: 12px;
      padding: 10px 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      font-size: 13px;
      line-height: 1;
      font-weight: 700;
      cursor: pointer;
      flex: 0 0 auto;
      transition: background-color 0.2s, border-color 0.2s, opacity 0.2s, box-shadow 0.2s,
        transform 0.2s;
      white-space: nowrap;
    }

    .order-driver-action--primary {
      background: #3d39af;
      color: white;
      border: 1.5px solid #3d39af;
      box-shadow: 0 4px 10px rgba(61, 57, 175, 0.22);
    }

    .order-driver-action--primary:hover:not(:disabled) {
      background: #342f9a;
      transform: translateY(-1px);
    }

    .order-driver-action--secondary {
      background: white;
      color: #64748b;
      border: 1.5px solid #cbd5e1;
    }

    .order-driver-action--secondary:hover {
      background: #f8fafc;
    }

    .order-driver-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .order-muted-text {
      color: #64748b;
      font-size: 13px;
      font-style: italic;
      line-height: 1.35;
    }
    .company-order-row--updated {
      animation: company-order-refresh 4.5s ease-out;
    }

    @keyframes company-order-refresh {
      0% {
        background: #ecfdf5;
        box-shadow: inset 4px 0 0 #10b981;
      }
      35% {
        background: #f0fdfa;
        box-shadow: inset 4px 0 0 #14b8a6;
      }
      100% {
        background: transparent;
        box-shadow: inset 4px 0 0 transparent;
      }
    }
  `,
})
export class OrdersListComponent implements OnInit, OnDestroy {
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
  updatedOrderIds = signal<Set<number>>(new Set());
  searchTerm = '';
  statusFilter = '';
  perPage: number = 10;

  rangeLabel = computed(() => {
    if (this.total() === 0) return 'Mostrando 0 - 0 de 0 pedidos';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `Mostrando ${start} - ${end} de ${this.total()} pedidos`;
  });

  pagesArray = computed(() => {
    const current = this.currentPage();
    const last = this.totalPages();
    const delta = 2;
    const left = current - delta;
    const right = current + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || (i >= left && i < right)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  });

  // Signals para controlar la visualización del Modal de Detalle
  showModal = signal(false);
  selectedOrder = signal<Order | null>(null);

  // Signals para el modal de asignación de precio
  showPriceModal = signal(false);
  priceOrder = signal<Order | null>(null);

  private companyId: number | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private ordersPollSub?: Subscription;
  private readonly ordersRefreshMs = 10000;
  private readonly updatedRowTimers = new Map<number, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    this.companyId = this.auth.user()?.idCompany ?? null;
    this.load();
    this.startOrdersPolling();
    if (this.companyId) {
      this.loadDrivers();
    }
  }

  ngOnDestroy(): void {
    this.stopOrdersPolling();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  loadDrivers(): void {
    let p = new HttpParams().set('perPage', 100).set('hasTruck', 'true');
    if (this.companyId) p = p.set('idCompany', this.companyId);
    this.driverService.getDrivers(p).subscribe({
      next: (res) => this.drivers.set(res.data || []),
      error: (err) => console.error('Error loading drivers', err),
    });
  }

  load(options: { silent?: boolean } = {}): void {
    if (!options.silent) this.loading.set(true);
    let p = new HttpParams().set('page', this.currentPage()).set('perPage', this.perPage);
    if (this.companyId) p = p.set('idCompany', this.companyId);
    if (this.statusFilter) p = p.set('status', this.statusFilter);

    this.orderService.getOrders(p).subscribe({
      next: (res) => {
        let data: Order[] = res.data ?? [];

        // LÓGICA DE CÁLCULO Y GUARDADO AUTOMÁTICO
        data.forEach((o) => {
          const detail = o.details?.[0];
          const hasPrice = o.details && (o.details[0]?.amount || o.details[0]?.price);
          const priceLocked = this.isPriceLocked(o);

          // Si NO tiene precio, lo calculamos y guardamos
          if (!hasPrice && detail && !priceLocked) {
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

        // Filtrado local por estado (respaldo si el backend no filtra)
        if (this.statusFilter) {
          data = data.filter((o) => o.status === this.statusFilter);
        }

        // Filtrado de búsqueda por texto
        if (this.searchTerm.trim()) {
          const term = this.searchTerm.toLowerCase();
          data = data.filter(
            (o) =>
              String(o.idOrder).includes(term) ||
              o.client?.companyName?.toLowerCase().includes(term),
          );
        }

        this.applyOrdersResponse(data, res, !!options.silent);
        if (!options.silent) this.loading.set(false);
      },
      error: (err) => {
        if (!options.silent) {
          this.ui.showToast(getHttpErrorMessage(err), 'error');
          this.loading.set(false);
        }
      },
    });
  }

  private startOrdersPolling(): void {
    this.ordersPollSub?.unsubscribe();
    this.ordersPollSub = interval(this.ordersRefreshMs).subscribe(() => {
      this.load({ silent: true });
    });
  }

  private stopOrdersPolling(): void {
    this.ordersPollSub?.unsubscribe();
    this.ordersPollSub = undefined;
    this.updatedRowTimers.forEach((timer) => clearTimeout(timer));
    this.updatedRowTimers.clear();
    this.updatedOrderIds.set(new Set());
  }

  private applyOrdersResponse(data: Order[], res: any, highlightChanges: boolean): void {
    const merged = data.map((order) => this.mergeOrderSnapshot(order));
    const changedIds = highlightChanges ? this.getChangedOrderIds(this.orders(), merged) : [];

    this.orders.set(merged);
    this.total.set(this.statusFilter ? merged.length : (res.meta?.total ?? merged.length));
    this.totalPages.set(res.meta?.lastPage ?? 1);
    this.syncOpenOrderState(merged, changedIds);
    changedIds.forEach((idOrder) => this.markOrderAsUpdated(idOrder));
  }

  private mergeOrderSnapshot(fresh: Order): Order {
    const current = this.orders().find((order) => order.idOrder === fresh.idOrder);
    if (!current) return fresh;

    return {
      ...fresh,
      editingDriver: current.editingDriver,
      newDriverId: current.editingDriver ? current.newDriverId : fresh.newDriverId,
      customRate: current.customRate ?? fresh.customRate,
      selectedAmount: fresh.selectedAmount ?? current.selectedAmount,
    };
  }

  private getChangedOrderIds(previous: Order[], next: Order[]): number[] {
    const previousById = new Map(previous.map((order) => [order.idOrder, this.orderSignature(order)]));
    return next
      .filter((order) => !previousById.has(order.idOrder) || previousById.get(order.idOrder) !== this.orderSignature(order))
      .map((order) => order.idOrder);
  }

  private orderSignature(order: Order): string {
    const detail = order.details?.[0];
    const amount = order.selectedAmount ?? detail?.amount ?? detail?.price ?? '';
    const driver = detail?.idDriver ?? '';
    return [order.status, order.createdAt, amount, driver].join('|');
  }

  private syncOpenOrderState(orders: Order[], changedIds: number[]): void {
    if (changedIds.length === 0) return;
    const changedSet = new Set(changedIds);

    const selected = this.selectedOrder();
    if (selected && changedSet.has(selected.idOrder)) {
      const fresh = orders.find((order) => order.idOrder === selected.idOrder);
      if (fresh) this.selectedOrder.set(fresh);
    }

    const priceOrder = this.priceOrder();
    if (priceOrder && changedSet.has(priceOrder.idOrder)) {
      const fresh = orders.find((order) => order.idOrder === priceOrder.idOrder);
      if (!fresh) return;
      if (this.isPriceLocked(fresh)) {
        this.closePriceModal();
        return;
      }
      this.priceOrder.set({
        ...fresh,
        customRate: priceOrder.customRate,
        selectedAmount: priceOrder.selectedAmount ?? fresh.selectedAmount,
      });
    }
  }

  private markOrderAsUpdated(idOrder: number): void {
    const existingTimer = this.updatedRowTimers.get(idOrder);
    if (existingTimer) clearTimeout(existingTimer);

    this.updatedOrderIds.update((ids) => {
      const next = new Set(ids);
      next.add(idOrder);
      return next;
    });

    const timer = setTimeout(() => {
      this.updatedOrderIds.update((ids) => {
        const next = new Set(ids);
        next.delete(idOrder);
        return next;
      });
      this.updatedRowTimers.delete(idOrder);
    }, 4500);
    this.updatedRowTimers.set(idOrder, timer);
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

  openPriceModal(order: Order): void {
    if (this.isPriceLocked(order)) return;
    this.priceOrder.set(order);
    this.showPriceModal.set(true);
  }

  closePriceModal(): void {
    this.showPriceModal.set(false);
    this.priceOrder.set(null);
  }

  confirmPrice(): void {
    const order = this.priceOrder();
    if (order && order.selectedAmount) {
      this.assignPrice(order.idOrder, order.selectedAmount);
      this.closePriceModal();
    }
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

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      esperando_aprobacion: 'Esperando Aprobación',
      aceptado: 'Aceptado',
      en_transito: 'En tránsito',
      entregado: 'Entregado',
      en_proceso: 'En proceso',
      completado: 'Completado',
      cancelado: 'Cancelado',
      anulado: 'Anulada',
      denegado: 'Denegado',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'badge-resort badge-pendiente',
      confirmado: 'badge-resort badge-confirmada',
      esperando_aprobacion: 'badge-resort badge-esperando',
      aceptado: 'badge-resort badge-aceptado',
      en_transito: 'badge-resort badge-activa',
      entregado: 'badge-resort badge-finalizada',
      en_proceso: 'badge-resort badge-activa',
      completado: 'badge-resort badge-finalizada',
      cancelado: 'badge-resort badge-cancelada',
      anulado: 'badge-resort badge-cancelada',
      denegado: 'badge-resort badge-cancelada',
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

  startEditDriver(order: Order): void {
    order.editingDriver = true;
    order.newDriverId = order.details?.[0]?.idDriver;
  }

  cancelEditDriver(order: Order): void {
    order.editingDriver = false;
    order.newDriverId = undefined;
  }

  confirmDriverEdit(order: Order): void {
    if (!order.newDriverId) return;
    this.orderService.assignDriver(order.idOrder, order.newDriverId).subscribe({
      next: () => {
        this.ui.showToast('Conductor actualizado correctamente', 'success');
        order.editingDriver = false;
        order.newDriverId = undefined;
        this.load();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  assignPrice(idOrder: number, amount?: number): void {
    if (amount === undefined || amount === null) return;
    const order = this.orders().find((item) => item.idOrder === idOrder);
    if (order && this.isPriceLocked(order)) return;

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

  isPriceLocked(order: Order): boolean {
    return ['aceptado', 'en_transito', 'entregado', 'cancelado', 'anulado'].includes(order.status);
  }

  isDriverLocked(order: Order): boolean {
    return ['entregado', 'completado', 'cancelado', 'anulado'].includes(order.status);
  }

  calculateByRate(order: Order, rate: number | undefined): void {
    if (this.isPriceLocked(order)) return;

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

  getOrderWeight(order: Order): number {
    const detail = order.details?.[0];
    if (!detail) return 0;
    return Math.max(
      0,
      Number.parseFloat(String(detail.unitWeight || '0').replace(/[^\d.]/g, '')) || 0,
    );
  }

  getOrderQuantity(order: Order): number {
    const detail = order.details?.[0];
    if (!detail) return 1;
    return Math.max(0, detail.quantity || 1);
  }
}
