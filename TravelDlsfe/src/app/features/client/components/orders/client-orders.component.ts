import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../services/client.service';
import { OrderService } from '../../../company/services/order.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import {
  ClientOrder,
  OrderPaginator,
  Company,
  OrderDetailDraft,
  PACKAGING_TYPES,
  PaymentMethod,
  SimulatePaymentPayload,
} from '../../interface/client.interface';
import { forkJoin, Subscription, interval } from 'rxjs';
import * as L from 'leaflet';

type StatusKey = 'pendiente' | 'entregado' | 'cancelado' | 'en_transito' | 'confirmado';
type TrackingPoint = { lat: number; lng: number };
type GeocodedDestination = TrackingPoint & { label: string };
type RouteResult = { coords: TrackingPoint[]; distanceKm: number; durationMinutes: number };
type SimulationStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';

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
              <p class="modal-subtitle">
                {{ selectedCompanyForOrder()!.businessName }} · RUC:
                {{ selectedCompanyForOrder()!.ruc }}
              </p>
            </div>
            <button class="btn-close-modal" (click)="closeOrderModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="custom-modal-body modal-body-scroll">
            <!-- ── Formulario de detalle ── -->
            <div class="detail-form-section">
              <h3 class="section-title">
                <i class="fa-solid fa-box-open"></i> Agregar detalle de carga
              </h3>

              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label for="cargoDesc">Descripción de carga *</label>
                  <input
                    id="cargoDesc"
                    type="text"
                    [(ngModel)]="draftDetail.cargoDescription"
                    placeholder="Ej: Harina de trigo, cemento…"
                    maxlength="255"
                  />
                </div>

                <div class="form-group">
                  <label for="weightValue">Peso *</label>
                  <input
                    id="weightValue"
                    type="number"
                    [(ngModel)]="draftDetail.weightValue"
                    placeholder="Ej: 50"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div class="form-group">
                  <label for="weightUnit">Unidad *</label>
                  <select id="weightUnit" [(ngModel)]="draftDetail.weightUnit">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="Ton">Ton</option>
                    <option value="qq">qq</option>
                  </select>
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
                  <input
                    id="deliveryAddr"
                    type="text"
                    [(ngModel)]="draftDetail.deliveryAddress"
                    placeholder="Calle, número, ciudad…"
                    maxlength="255"
                  />
                </div>
              </div>

              <button
                class="btn-add-detail"
                (click)="addDetailToCart()"
                [disabled]="!isDetailValid()"
              >
                <i class="fa-solid fa-plus"></i> Agregar al carrito
              </button>
            </div>

            <!-- ── Lista de detalles (carrito) ── -->
            @if (cartDetails().length > 0) {
              <div class="cart-section">
                <h3 class="section-title">
                  <i class="fa-solid fa-cart-shopping"></i> Detalles de la orden ({{
                    cartDetails().length
                  }})
                </h3>
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
                          <span class="cart-item-address"
                            ><i class="fa-solid fa-location-dot"></i>
                            {{ item.deliveryAddress }}</span
                          >
                        </div>
                      </div>
                      <button
                        class="btn-remove-detail"
                        (click)="removeFromCart($index)"
                        title="Eliminar"
                      >
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
            <button class="btn-cancel" (click)="closeOrderModal()" [disabled]="creatingOrder()">
              Cancelar
            </button>
            <button
              class="btn-confirm"
              (click)="executeOrder()"
              [disabled]="creatingOrder() || cartDetails().length === 0"
            >
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
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'all'"
            (click)="applyFilter('all')"
          >
            Todos
          </button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'pending'"
            (click)="applyFilter('pending')"
          >
            Pendientes
          </button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'delivered'"
            (click)="applyFilter('delivered')"
          >
            Entregadas
          </button>
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
                  <th>Acciones</th>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Fecha creación</th>
                  <th>Última actualización</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders(); track order.idOrder) {
                  <tr [class.order-row--updated]="updatedOrderIds().has(order.idOrder)">
                    <td class="order-id">#{{ order.idOrder }}</td>
                    <td>
                      <button class="btn-view-details" (click)="viewOrderDetails(order)">
                        <i class="fa-regular fa-eye"></i>
                        <span>Ver detalles</span>
                      </button>
                    </td>
                    <td>{{ order.company?.businessName ?? 'Sin asignar' }}</td>
                    <td>
                      <span class="status-chip" [class]="'status-chip status-' + order.status">
                        {{ statusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="date-cell">{{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="date-cell">{{ order.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (meta()) {
            <div class="pagination-bar">
              <span class="page-info"
                >Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ meta()!.total }}</span
              >
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

      <!-- ═══════════ ORDER DETAIL MODAL ═══════════ -->
      @if (showDetailModal() && selectedOrderDetail()) {
        <div class="custom-modal-overlay" (click)="closeDetailModal()"></div>
        <div class="custom-modal custom-modal--detail">
          <!-- Header -->
          <div class="detail-modal-header">
            <div>
              <h2 class="detail-modal-title">
                Detalles del Pedido #{{ selectedOrderDetail()!.idOrder }}
              </h2>
              <p class="detail-modal-date">
                Registrado el {{ selectedOrderDetail()!.createdAt | date: 'dd/MM/yyyy' }} a las
                {{ selectedOrderDetail()!.createdAt | date: 'hh:mm a' }}
              </p>
            </div>
            <button class="btn-close-modal" (click)="closeDetailModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="detail-modal-body">
            <!-- Company Info -->
            <div class="detail-section">
              <h3 class="detail-section-label">INFORMACIÓN DE LA EMPRESA</h3>
              <div class="detail-info-card">
                <p class="detail-info-name">
                  {{ selectedOrderDetail()!.company?.businessName ?? 'Empresa no asignada' }}
                </p>
                <p class="detail-info-sub">
                  <strong>Estado actual:</strong>
                  <span
                    class="status-chip"
                    [class]="'status-chip status-' + selectedOrderDetail()!.status"
                    style="margin-left: 6px;"
                  >
                    {{ statusLabel(selectedOrderDetail()!.status) }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Order Items -->
            <div class="detail-section">
              <h3 class="detail-section-label">ITEMS DEL PEDIDO</h3>
              <div class="detail-items-list">
                @if (selectedOrderDetail()!.details && selectedOrderDetail()!.details!.length > 0) {
                  @for (det of selectedOrderDetail()!.details; track $index) {
                    <div class="detail-item-card">
                      <div class="detail-item-left">
                        <p class="detail-item-title">
                          {{ det.cargoDescription || 'Servicio de Transporte' }}
                        </p>
                        <div class="detail-item-tags">
                          <span class="detail-tag">
                            <i class="fa-solid fa-cubes"></i> Cant: {{ det.amount || 1 }}
                          </span>
                          <span class="detail-tag">
                            <i class="fa-solid fa-weight-hanging"></i> Peso:
                            {{ det.unitWeight || 'N/A' }}
                          </span>
                          <span class="detail-tag">
                            <i class="fa-solid fa-box"></i>
                            {{ getPackagingLabel(det.typePackaging) }}
                          </span>
                        </div>
                        @if (det.deliveryAddress) {
                          <p class="detail-item-address">
                            <i class="fa-solid fa-location-dot"></i> {{ det.deliveryAddress }}
                          </p>
                        }
                      </div>
                      <div class="detail-item-right">
                        @if (det.amount && det.amount > 0) {
                          <p class="detail-item-price">C$ {{ det.amount | number: '1.2-2' }}</p>
                        } @else {
                          <p class="detail-item-price detail-item-price--pending">Sin precio</p>
                        }
                      </div>
                    </div>
                  }

                  <!-- Total -->
                  @if (getOrderTotal(selectedOrderDetail()!) > 0) {
                    <div class="detail-total-bar">
                      <span class="detail-total-label">Total estimado</span>
                      <span class="detail-total-value"
                        >C$ {{ getOrderTotal(selectedOrderDetail()!) | number: '1.2-2' }}</span
                      >
                    </div>
                  }
                } @else {
                  <p class="detail-no-items">
                    <i class="fa-solid fa-inbox"></i>
                    Este pedido no cuenta con detalles de carga.
                  </p>
                }
              </div>
            </div>

            <!-- Price approval section -->
            @if (selectedOrderDetail()!.status === 'esperando_aprobacion') {
              <div class="price-approval-section">
                <h3 class="detail-section-label" style="color: #d97706; margin-top: 1rem;">
                  <i class="fa-solid fa-triangle-exclamation"></i> PRECIO ASIGNADO PENDIENTE DE
                  APROBACIÓN
                </h3>
                <div class="approval-card">
                  <p>
                    La empresa ha asignado un precio total de
                    <strong>C$ {{ getOrderTotal(selectedOrderDetail()!) | number: '1.2-2' }}</strong
                    >. ¿Desea aceptar o rechazar esta tarifa?
                  </p>
                  <div class="approval-actions">
                    <button
                      class="btn-deny"
                      (click)="respondPrice(false)"
                      [disabled]="isRespondingPrice()"
                    >
                      <i class="fa-solid fa-xmark"></i> Rechazar
                    </button>
                    <button
                      class="btn-accept"
                      (click)="openPaymentModal()"
                      [disabled]="isRespondingPrice()"
                    >
                      <i class="fa-solid fa-check"></i> Aceptar
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="detail-modal-footer">
            <!-- Botón de tracking solo si la orden está en_transito -->
            @if (selectedOrderDetail()!.status === 'en_transito') {
              <button class="btn-track-order" (click)="openTrackingModal(selectedOrderDetail()!)">
                <i class="fa-solid fa-location-crosshairs"></i>
                Seguir Pedido en Vivo
              </button>
            }
            <button class="btn-confirm" (click)="closeDetailModal()">Entendido</button>
          </div>
        </div>
      }

      @if (showPaymentModal() && selectedOrderDetail()) {
        <div class="custom-modal-overlay" (click)="closePaymentModal()"></div>
        <div class="custom-modal custom-modal--payment">
          <div class="payment-modal-header">
            <div>
              <p class="payment-kicker">Pasarela simulada</p>
              <h2>Pagar Pedido #{{ selectedOrderDetail()!.idOrder }}</h2>
              <span>Total a pagar: C$ {{ getOrderTotal(selectedOrderDetail()!) | number: '1.2-2' }}</span>
            </div>
            <button class="btn-close-modal" type="button" (click)="closePaymentModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="payment-modal-body">
            <section class="payment-section">
              <h3>Informacion de contacto</h3>
              <div class="payment-grid payment-grid--two">
                <label class="payment-field">
                  <span>Nombre del titular</span>
                  <div class="payment-input-wrap">
                    <i class="fa-regular fa-user"></i>
                    <input
                      type="text"
                      [(ngModel)]="paymentForm.cardHolderName"
                      placeholder="Nombre y apellido"
                      maxlength="255"
                    />
                  </div>
                </label>
                <label class="payment-field">
                  <span>Correo de facturacion</span>
                  <div class="payment-input-wrap">
                    <i class="fa-regular fa-envelope"></i>
                    <input
                      type="email"
                      [(ngModel)]="paymentForm.billingEmail"
                      placeholder="correo@ejemplo.com"
                      maxlength="255"
                    />
                  </div>
                </label>
              </div>
            </section>

            <section class="payment-section">
              <h3>Metodo de pago</h3>
              <div class="payment-methods">
                <button
                  type="button"
                  class="payment-method"
                  [class.payment-method--active]="paymentForm.method === 'card'"
                  (click)="selectPaymentMethod('card')"
                >
                  <i class="fa-regular fa-credit-card"></i>
                  <span>Tarjeta</span>
                  <small>Visa / Mastercard</small>
                </button>
                <button
                  type="button"
                  class="payment-method"
                  [class.payment-method--active]="paymentForm.method === 'transfer'"
                  (click)="selectPaymentMethod('transfer')"
                >
                  <i class="fa-solid fa-building-columns"></i>
                  <span>Transferencia</span>
                  <small>Referencia simulada</small>
                </button>
              </div>
            </section>

            @if (paymentForm.method === 'card') {
              <section class="payment-section payment-card-form">
                <label class="payment-field payment-field--full">
                  <span>Numero de tarjeta</span>
                  <div class="payment-input-wrap">
                    <i class="fa-regular fa-credit-card"></i>
                    <input
                      type="text"
                      [(ngModel)]="paymentForm.cardNumber"
                      (ngModelChange)="formatCardNumber($event)"
                      placeholder="1234 1234 1234 1234"
                      maxlength="23"
                    />
                  </div>
                </label>
                <div class="payment-grid payment-grid--two">
                  <label class="payment-field">
                    <span>Vencimiento</span>
                    <div class="payment-input-wrap">
                      <i class="fa-regular fa-calendar"></i>
                      <input
                        type="text"
                        [(ngModel)]="paymentForm.expiry"
                        (ngModelChange)="formatExpiry($event)"
                        placeholder="MM/AA"
                        maxlength="5"
                      />
                    </div>
                  </label>
                  <label class="payment-field">
                    <span>CVC</span>
                    <div class="payment-input-wrap">
                      <i class="fa-solid fa-key"></i>
                      <input
                        type="password"
                        [(ngModel)]="paymentForm.cvc"
                        placeholder="CVC"
                        maxlength="4"
                      />
                    </div>
                  </label>
                </div>
              </section>
            } @else {
              <section class="payment-section transfer-box">
                <div>
                  <strong>Transferencia simulada</strong>
                  <p>Banco TravelDLS - Cuenta 000-123456-789</p>
                </div>
                <label class="payment-field payment-field--full">
                  <span>Referencia</span>
                  <div class="payment-input-wrap">
                    <i class="fa-solid fa-hashtag"></i>
                    <input
                      type="text"
                      [(ngModel)]="paymentForm.transferReference"
                      placeholder="REF-123456"
                      maxlength="100"
                    />
                  </div>
                </label>
              </section>
            }

            <section class="payment-summary">
              <div>
                <span>Pedido</span>
                <strong>#{{ selectedOrderDetail()!.idOrder }}</strong>
              </div>
              <div>
                <span>Empresa</span>
                <strong>{{ selectedOrderDetail()!.company?.businessName ?? 'Empresa no asignada' }}</strong>
              </div>
              <div class="payment-summary-total">
                <span>Total</span>
                <strong>C$ {{ getOrderTotal(selectedOrderDetail()!) | number: '1.2-2' }}</strong>
              </div>
            </section>
          </div>

          <div class="payment-modal-footer">
            <button type="button" class="btn-cancel" (click)="closePaymentModal()" [disabled]="isProcessingPayment()">
              Cancelar
            </button>
            <button type="button" class="btn-pay-now" (click)="submitPayment()" [disabled]="isProcessingPayment() || !isPaymentFormValid()">
              @if (isProcessingPayment()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Procesando...
              } @else {
                <i class="fa-solid fa-lock"></i> Pagar ahora
              }
            </button>
          </div>
        </div>
      }

      <!-- ═══════════ TRACKING MODAL ═══════════ -->
      @if (showTrackingModal()) {
        <div class="custom-modal-overlay" (click)="closeTrackingModal()"></div>
        <div class="custom-modal custom-modal--tracking">
          <!-- Header -->
          <div class="tracking-modal-header">
            <div class="tracking-header-info">
              <div class="tracking-live-badge">
                <span class="tracking-live-dot"></span>
                EN VIVO
              </div>
              <h2>Seguimiento del Pedido #{{ trackingOrder()?.idOrder }}</h2>
              <p class="tracking-subtitle">
                La ubicación del conductor se actualiza automáticamente cada 10 segundos
              </p>
            </div>
            <button class="btn-close-modal" (click)="closeTrackingModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Mapa -->
          <div class="tracking-map-container">
            <div id="tracking-map" class="tracking-map"></div>
            <section class="tracking-simulation-panel">
              <div class="simulation-heading">
                <div>
                  <span class="simulation-kicker">Simulación</span>
                  <strong>Vista aproximada hasta el destino</strong>
                </div>
                <span class="simulation-status" [class]="'simulation-status simulation-status--' + simulationStatus()">
                  {{ simulationStatusLabel() }}
                </span>
              </div>

              <div class="simulation-controls">
                <label class="simulation-speed-field">
                  <span>Velocidad del camión</span>
                  <div class="simulation-speed-input">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      step="5"
                      [ngModel]="simulationSpeedKmh()"
                      (ngModelChange)="updateSimulationSpeed($event)"
                      [disabled]="simulationStatus() === 'running'"
                    />
                    <small>km/h</small>
                  </div>
                </label>

                <div class="simulation-metrics">
                  <div>
                    <span>Distancia</span>
                    <strong>{{ simulationDistanceKm() | number: '1.1-1' }} km</strong>
                  </div>
                  <div>
                    <span>ETA</span>
                    <strong>{{ simulationEtaLabel() }}</strong>
                  </div>
                  <div>
                    <span>Avance</span>
                    <strong>{{ simulationProgressPct() | number: '1.0-0' }}%</strong>
                  </div>
                </div>

                <div class="simulation-actions">
                  <button type="button" class="btn-simulate" (click)="startSimulation()" [disabled]="!canStartSimulation()">
                    @if (simulationLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i>
                      Calculando...
                    } @else {
                      <i class="fa-solid fa-play"></i>
                      Simular
                    }
                  </button>
                  <button
                    type="button"
                    class="btn-simulation-secondary"
                    (click)="toggleSimulationPause()"
                    [disabled]="simulationStatus() !== 'running' && simulationStatus() !== 'paused'"
                  >
                    <i [class]="simulationStatus() === 'paused' ? 'fa-solid fa-play' : 'fa-solid fa-pause'"></i>
                    {{ simulationStatus() === 'paused' ? 'Reanudar' : 'Pausar' }}
                  </button>
                  <button
                    type="button"
                    class="btn-simulation-secondary"
                    (click)="resetSimulation()"
                    [disabled]="simulationStatus() === 'idle' && simulationProgressPct() === 0"
                  >
                    <i class="fa-solid fa-rotate-left"></i>
                    Reiniciar
                  </button>
                </div>
              </div>

              @if (simulationMessage()) {
                <p class="simulation-message">{{ simulationMessage() }}</p>
              }
            </section>

            <!-- Info del conductor -->
            @if (trackingLocation()) {
              <div class="tracking-info-bar">
                <div class="tracking-info-item">
                  <i class="fa-solid fa-truck"></i>
                  <span>Conductor en camino</span>
                </div>
                <div class="tracking-info-item">
                  <i class="fa-regular fa-clock"></i>
                  <span>Última actualización: {{ lastTrackingUpdate() }}</span>
                </div>
              </div>
            } @else {
              <div class="tracking-no-location">
                <i class="fa-solid fa-satellite-dish"></i>
                <p>Esperando ubicación del conductor...</p>
                <small>El conductor debe iniciar el viaje para compartir su ubicación</small>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './client-orders.component.css',
})
export class ClientOrdersComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly orderService = inject(OrderService);
  private readonly ui = inject(InteractionService);
  private readonly ngZone = inject(NgZone);

  // Detail modal state
  readonly showDetailModal = signal(false);
  readonly selectedOrderDetail = signal<ClientOrder | null>(null);

  readonly loading = signal(true);
  readonly allOrders = signal<ClientOrder[]>([]);
  readonly filteredOrders = signal<ClientOrder[]>([]);
  readonly meta = signal<OrderPaginator['meta'] | null>(null);
  readonly updatedOrderIds = signal<Set<number>>(new Set());

  // Company picker state
  readonly loadingCompanies = signal(false);
  readonly companies = signal<Company[]>([]);
  readonly selectedCompanyForOrder = signal<Company | null>(null);
  readonly creatingOrder = signal(false);
  readonly isRespondingPrice = signal(false);
  readonly showPaymentModal = signal(false);
  readonly isProcessingPayment = signal(false);
  paymentForm = this.emptyPaymentForm();
  searchTerm = '';
  private searchTimeout: any;

  // Cart / detail draft
  readonly cartDetails = signal<OrderDetailDraft[]>([]);
  readonly packagingTypes = PACKAGING_TYPES;
  draftDetail: OrderDetailDraft = this.emptyDraft();

  activeFilter = 'all';
  perPage = 10;
  currentPage = 1;
  private ordersPollSub?: Subscription;
  private readonly ordersRefreshMs = 10000;
  private readonly updatedRowTimers = new Map<number, ReturnType<typeof setTimeout>>();

  // ── Tracking state ──
  readonly showTrackingModal = signal(false);
  readonly trackingOrder = signal<ClientOrder | null>(null);
  readonly trackingLocation = signal<{ latitude: number; longitude: number } | null>(null);
  readonly lastTrackingUpdate = signal<string>('--');
  readonly simulationStatus = signal<SimulationStatus>('idle');
  readonly simulationSpeedKmh = signal(45);
  readonly simulationDistanceKm = signal(0);
  readonly simulationEtaMinutes = signal(0);
  readonly simulationProgressPct = signal(0);
  readonly simulationMessage = signal('');
  readonly simulationLoading = signal(false);
  private trackingMap: L.Map | null = null;
  private driverMarker: L.Marker | null = null;
  private destinationMarker: L.Marker | null = null;
  private trackingPollSub?: Subscription;
  // Ruta recorrida
  private routePolyline: L.Polyline | null = null;
  private routeCoords: L.LatLngExpression[] = [];
  private simulationRoutePolyline: L.Polyline | null = null;
  private simulationProgressPolyline: L.Polyline | null = null;
  private simulationRoute: TrackingPoint[] = [];
  private simulationFrameId: number | null = null;
  private simulationStartedAt = 0;
  private simulationElapsedBeforePause = 0;
  private simulationPreviewDurationMs = 0;
  private readonly geocodeCache = new Map<string, GeocodedDestination | null>();
  private readonly trackingMaxAgeMs = 2 * 60 * 1000;
  // Para animación suave
  private animFrameId: number | null = null;
  private prevLatLng: L.LatLng | null = null;

  ngOnInit(): void {
    this.loadOrders();
    this.startOrdersPolling();
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.stopOrdersPolling();
    this.destroyTrackingMap();
  }

  /* ── Orders ── */
  private loadOrders(options: { silent?: boolean } = {}): void {
    const u = this.auth.user();
    if (!u?.idClient) {
      this.loading.set(false);
      return;
    }
    if (!options.silent) this.loading.set(true);
    this.clientService
      .getOrders({ idClient: u.idClient, page: this.currentPage, perPage: this.perPage })
      .subscribe({
        next: (res) => {
          this.applyOrdersResponse(res, !!options.silent);
          if (!options.silent) this.loading.set(false);
        },
        error: () => {
          if (!options.silent) this.loading.set(false);
        },
      });
  }

  private startOrdersPolling(): void {
    this.ordersPollSub?.unsubscribe();
    this.ordersPollSub = interval(this.ordersRefreshMs).subscribe(() => {
      this.loadOrders({ silent: true });
    });
  }

  private stopOrdersPolling(): void {
    this.ordersPollSub?.unsubscribe();
    this.ordersPollSub = undefined;
    this.updatedRowTimers.forEach((timer) => clearTimeout(timer));
    this.updatedRowTimers.clear();
    this.updatedOrderIds.set(new Set());
  }

  private applyOrdersResponse(res: OrderPaginator, highlightChanges: boolean): void {
    const orders = res.data ?? [];
    const changedIds = highlightChanges ? this.getStatusChangedOrderIds(this.allOrders(), orders) : [];

    this.allOrders.set(orders);
    this.meta.set(res.meta);
    this.applyFilterLocal();
    this.syncOpenOrderState(orders, changedIds);
    changedIds.forEach((idOrder) => this.markOrderAsUpdated(idOrder));
  }

  private getStatusChangedOrderIds(previous: ClientOrder[], next: ClientOrder[]): number[] {
    const previousStatus = new Map(previous.map((order) => [order.idOrder, order.status]));
    return next
      .filter((order) => previousStatus.has(order.idOrder) && previousStatus.get(order.idOrder) !== order.status)
      .map((order) => order.idOrder);
  }

  private syncOpenOrderState(orders: ClientOrder[], changedIds: number[]): void {
    if (changedIds.length === 0) return;
    const changedSet = new Set(changedIds);

    const selected = this.selectedOrderDetail();
    if (selected && changedSet.has(selected.idOrder)) {
      const fresh = orders.find((order) => order.idOrder === selected.idOrder);
      if (fresh) this.selectedOrderDetail.set(this.mergeOrderSnapshot(selected, fresh));
    }

    const trackingOrder = this.trackingOrder();
    if (trackingOrder && changedSet.has(trackingOrder.idOrder)) {
      const fresh = orders.find((order) => order.idOrder === trackingOrder.idOrder);
      if (!fresh) return;
      if (fresh.status === 'entregado') {
        this.closeTrackingModal();
        return;
      }
      this.trackingOrder.set(this.mergeOrderSnapshot(trackingOrder, fresh));
    }
  }

  private mergeOrderSnapshot(current: ClientOrder, fresh: ClientOrder): ClientOrder {
    return {
      ...current,
      ...fresh,
      details: fresh.details ?? current.details,
      payment: fresh.payment ?? current.payment,
    };
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

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilterLocal();
  }

  private applyFilterLocal(): void {
    const all = this.allOrders();
    if (this.activeFilter === 'all') {
      this.filteredOrders.set(all);
    } else if (this.activeFilter === 'pending') {
      this.filteredOrders.set(
        all.filter((o) => ['pendiente', 'confirmado', 'en_transito', 'esperando_aprobacion', 'aceptado'].includes(o.status)),
      );
    } else if (this.activeFilter === 'delivered') {
      this.filteredOrders.set(all.filter((o) => ['entregado', 'completado', 'completada'].includes(o.status)));
    } else if (this.activeFilter === 'cancelled') {
      this.filteredOrders.set(all.filter((o) => o.status === 'cancelado'));
    } else {
      this.filteredOrders.set(all.filter((o) => o.status === this.activeFilter));
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
    return m ? (m.currentPage - 1) * m.perPage + 1 : 0;
  }
  rangeEnd(): number {
    const m = this.meta();
    return m ? Math.min(m.currentPage * m.perPage, m.total) : 0;
  }
  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      en_transito: 'En tránsito',
      completada: 'Completada',
      cancelada: 'Cancelada',
      en_proceso: 'En proceso',
      confirmado: 'Confirmado',
      completado: 'Completado',
      esperando_aprobacion: 'Esperando Aprobación',
      aceptado: 'Aceptado',
      denegado: 'Denegado',
    };
    return map[status] ?? status;
  }

  /* ── Detail modal ── */
  viewOrderDetails(order: ClientOrder): void {
    // Fetch fresh data from backend to get the latest price/details
    this.clientService.getOrderById(order.idOrder).subscribe({
      next: (freshOrder) => {
        this.selectedOrderDetail.set(freshOrder);
        this.showDetailModal.set(true);
      },
      error: () => {
        // Fallback to cached data if request fails
        this.selectedOrderDetail.set(order);
        this.showDetailModal.set(true);
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedOrderDetail.set(null);
  }

  respondPrice(accepted: boolean): void {
    const order = this.selectedOrderDetail();
    if (!order) return;

    this.isRespondingPrice.set(true);
    this.clientService.respondPrice(order.idOrder, { accepted }).subscribe({
      next: (updatedOrder) => {
        this.isRespondingPrice.set(false);
        this.ui.showToast(
          accepted ? 'Precio aceptado exitosamente' : 'Precio rechazado',
          'success',
        );
        this.closeDetailModal();
        this.loadOrders();
      },
      error: (err) => {
        this.isRespondingPrice.set(false);
        this.ui.mostrarError(err);
      },
    });
  }

  openPaymentModal(): void {
    const order = this.selectedOrderDetail();
    if (!order || this.getOrderTotal(order) <= 0) return;
    const user = this.auth.user();
    this.paymentForm = this.emptyPaymentForm(user?.email ?? '', user?.name ?? '');
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    if (this.isProcessingPayment()) return;
    this.showPaymentModal.set(false);
    this.paymentForm = this.emptyPaymentForm();
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentForm.method = method;
  }

  formatCardNumber(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    this.paymentForm.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.paymentForm.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  isPaymentFormValid(): boolean {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.paymentForm.billingEmail.trim());
    if (!emailOk) return false;

    if (this.paymentForm.method === 'transfer') {
      return this.paymentForm.transferReference.trim().length >= 4;
    }

    const cardDigits = this.paymentForm.cardNumber.replace(/\D/g, '');
    return (
      this.paymentForm.cardHolderName.trim().length >= 3 &&
      cardDigits.length >= 12 &&
      /^\d{2}\/\d{2}$/.test(this.paymentForm.expiry.trim()) &&
      /^\d{3,4}$/.test(this.paymentForm.cvc.trim())
    );
  }

  submitPayment(): void {
    const order = this.selectedOrderDetail();
    if (!order || !this.isPaymentFormValid()) return;

    const payload: SimulatePaymentPayload = {
      method: this.paymentForm.method,
      billingEmail: this.paymentForm.billingEmail.trim(),
    };

    if (this.paymentForm.method === 'card') {
      payload.cardHolderName = this.paymentForm.cardHolderName.trim();
      payload.cardNumber = this.paymentForm.cardNumber.trim();
      payload.expiry = this.paymentForm.expiry.trim();
      payload.cvc = this.paymentForm.cvc.trim();
    } else {
      payload.transferReference = this.paymentForm.transferReference.trim();
    }

    this.isProcessingPayment.set(true);
    this.clientService.simulateOrderPayment(order.idOrder, payload).subscribe({
      next: (updatedOrder) => {
        this.isProcessingPayment.set(false);
        this.showPaymentModal.set(false);
        this.ui.showToast('Pago registrado correctamente', 'success');
        this.selectedOrderDetail.set(updatedOrder);
        this.closeDetailModal();
        this.loadOrders();
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.ui.mostrarError(err);
      },
    });
  }

  private emptyPaymentForm(billingEmail = '', cardHolderName = ''): {
    method: PaymentMethod;
    billingEmail: string;
    cardHolderName: string;
    cardNumber: string;
    expiry: string;
    cvc: string;
    transferReference: string;
  } {
    return {
      method: 'card',
      billingEmail,
      cardHolderName,
      cardNumber: '',
      expiry: '',
      cvc: '',
      transferReference: '',
    };
  }

  getOrderTotal(order: ClientOrder): number {
    if (!order.details || order.details.length === 0) return 0;
    return order.details.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  }

  private loadCompanies(search?: string): void {
    this.loadingCompanies.set(true);
    this.clientService.getCompanies({ page: 1, perPage: 50, search }).subscribe({
      next: (res) => {
        this.companies.set(res.data);
        this.loadingCompanies.set(false);
      },
      error: () => {
        this.companies.set([]);
        this.loadingCompanies.set(false);
      },
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
    return {
      cargoDescription: '',
      amount: 1,
      weightValue: null,
      weightUnit: 'kg',
      unitWeight: '',
      deliveryAddress: '',
      typePackaging: 'pallet',
    };
  }

  isDetailValid(): boolean {
    const d = this.draftDetail;
    return (
      d.cargoDescription.trim().length >= 3 &&
      d.weightValue !== null && d.weightValue > 0 &&
      d.weightUnit.trim().length > 0 &&
      d.deliveryAddress.trim().length >= 5
    );
  }

  addDetailToCart(): void {
    if (!this.isDetailValid()) return;
    const combinedWeight = `${this.draftDetail.weightValue} ${this.draftDetail.weightUnit}`;
    this.cartDetails.update((list) => [
      ...list,
      {
        cargoDescription: this.draftDetail.cargoDescription.trim(),
        amount: 1,
        weightValue: this.draftDetail.weightValue,
        weightUnit: this.draftDetail.weightUnit,
        unitWeight: combinedWeight,
        deliveryAddress: this.draftDetail.deliveryAddress.trim(),
        typePackaging: this.draftDetail.typePackaging,
      },
    ]);
    this.draftDetail = this.emptyDraft();
  }

  removeFromCart(index: number): void {
    this.cartDetails.update((list) => list.filter((_, i) => i !== index));
  }

  getPackagingLabel(value: string): string {
    return this.packagingTypes.find((p) => p.value === value)?.label ?? value;
  }

  /* ── Execute Order + Details ── */
  executeOrder(): void {
    const u = this.auth.user();
    const company = this.selectedCompanyForOrder();
    const details = this.cartDetails();
    if (!company || details.length === 0) return;

    if (!u?.idClient) {
      this.ui.mostrarError(
        'Tu cuenta de usuario no tiene un perfil de Cliente (idClient) asociado. Por favor, actualiza tu perfil antes de crear órdenes.',
      );
      return;
    }

    this.creatingOrder.set(true);

    // 1) Crear la cabecera de la orden
    this.clientService
      .createOrder({ idClient: u.idClient, idCompany: company.idCompany })
      .subscribe({
        next: (order) => {
          // 2) Crear todos los detalles en paralelo
          const detailRequests = details.map((d) =>
            this.clientService.createOrderDetail({
              idOrder: order.idOrder,
              cargoDescription: d.cargoDescription,
              amount: d.amount,
              unitWeight: d.unitWeight,
              deliveryAddress: d.deliveryAddress,
              typePackaging: d.typePackaging,
            }),
          );

          forkJoin(detailRequests).subscribe({
            next: () => {
              this.creatingOrder.set(false);
              this.selectedCompanyForOrder.set(null);
              this.cartDetails.set([]);
              this.draftDetail = this.emptyDraft();
              this.ui.showToast(
                'Orden creada exitosamente con ' + details.length + ' detalle(s)',
                'success',
              );
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

  /* ── Tracking ── */

  openTrackingModal(order: ClientOrder): void {
    this.trackingOrder.set(order);
    this.showTrackingModal.set(true);
    // Esperamos al siguiente tick para que el DOM renderice el contenedor del mapa
    setTimeout(() => this.initTrackingMap(order), 100);
  }

  closeTrackingModal(): void {
    this.destroyTrackingMap();
    this.showTrackingModal.set(false);
    this.trackingOrder.set(null);
    this.trackingLocation.set(null);
    this.lastTrackingUpdate.set('--');
  }

  private initTrackingMap(order: ClientOrder): void {
    // Inicializar el mapa Leaflet centrado en Nicaragua por defecto
    const defaultCenter: L.LatLngExpression = [12.865416, -85.207229];

    this.trackingMap = L.map('tracking-map', {
      center: defaultCenter,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.trackingMap);

    // Inicializar la polyline vacía para trazar la ruta
    this.routeCoords = [];
    this.routePolyline = L.polyline([], {
      color: '#6366f1',
      weight: 4,
      opacity: 0.75,
      dashArray: '8, 6',
      lineJoin: 'round',
    }).addTo(this.trackingMap);

    // Cargar la ubicación del conductor de inmediato
    this.fetchAndUpdateDriverMarker(order.idOrder);

    // Polling cada 10 segundos (reducido de 15s)
    this.trackingPollSub = interval(10000).subscribe(() => {
      this.fetchAndUpdateDriverMarker(order.idOrder);
    });
  }

  canStartSimulation(): boolean {
    const status = this.simulationStatus();
    return !this.simulationLoading() && status !== 'running' && !!this.trackingLocation() && this.getTrackingDestinationAddress().length > 0;
  }

  updateSimulationSpeed(value: unknown): void {
    const parsed = Number(value);
    const nextSpeed = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 5), 120) : 45;
    this.simulationSpeedKmh.set(nextSpeed);
    this.updateSimulationEta();
  }

  simulationEtaLabel(): string {
    const minutes = this.simulationEtaMinutes();
    if (minutes <= 0) return '--';
    if (minutes < 1) return 'Menos de 1 min';
    if (minutes < 60) return `${Math.ceil(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const rest = Math.ceil(minutes % 60);
    return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
  }

  simulationStatusLabel(): string {
    const labels: Record<SimulationStatus, string> = {
      idle: 'Lista',
      running: 'En simulación',
      paused: 'Pausada',
      finished: 'Completada',
      error: 'Sin datos',
    };
    return labels[this.simulationStatus()];
  }

  async startSimulation(): Promise<void> {
    if (!this.trackingMap) return;

    const currentLocation = this.trackingLocation();
    const destinationAddress = this.getTrackingDestinationAddress();

    if (!currentLocation) {
      this.simulationStatus.set('error');
      this.simulationMessage.set('Esperando ubicación real del conductor para iniciar la simulación.');
      return;
    }

    if (!destinationAddress) {
      this.simulationStatus.set('error');
      this.simulationMessage.set('Este pedido no tiene dirección de destino para simular.');
      return;
    }

    this.clearSimulation(false);
    this.simulationLoading.set(true);
    this.simulationMessage.set('Buscando destino y ruta real...');

    const origin: TrackingPoint = { lat: currentLocation.latitude, lng: currentLocation.longitude };

    try {
      const destination = await this.geocodeDestination(destinationAddress);
      if (!destination) {
        this.simulationStatus.set('error');
        this.simulationMessage.set('No se pudo ubicar esa dirección en OpenStreetMap. Revisa que sea más específica.');
        return;
      }

      const route = await this.fetchOsrmRoute(origin, destination);
      if (!route || route.coords.length < 2) {
        this.simulationStatus.set('error');
        this.simulationMessage.set('No se pudo calcular una ruta real para este origen y destino.');
        return;
      }

      this.simulationRoute = route.coords;
      this.simulationDistanceKm.set(route.distanceKm);
      this.updateSimulationEta();
      this.simulationProgressPct.set(0);
      this.simulationStatus.set('running');
      this.simulationMessage.set(`Ruta real calculada con OSRM hacia ${destination.label}.`);
      this.simulationElapsedBeforePause = 0;
      this.simulationPreviewDurationMs = Math.max(8000, Math.min(45000, this.simulationEtaMinutes() * 60_000 / 8));

      this.simulationRoutePolyline = L.polyline(route.coords.map((point) => [point.lat, point.lng] as [number, number]), {
        color: '#0ea5e9',
        weight: 5,
        opacity: 0.72,
        dashArray: '10, 8',
        lineJoin: 'round',
      }).addTo(this.trackingMap);

      this.simulationProgressPolyline = L.polyline([[origin.lat, origin.lng]], {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(this.trackingMap);

      this.destinationMarker = L.marker([destination.lat, destination.lng], { icon: this.createDestinationIcon() })
        .addTo(this.trackingMap)
        .bindPopup(`<strong>Destino</strong><br>${this.escapeHtml(destination.label)}`);

      if (this.driverMarker) {
        this.driverMarker.setLatLng([origin.lat, origin.lng]);
        this.driverMarker.setIcon(this.createSimulationTruckIcon());
      } else {
        this.driverMarker = L.marker([origin.lat, origin.lng], { icon: this.createSimulationTruckIcon() })
          .addTo(this.trackingMap)
          .bindPopup('<strong>Camión</strong><br>Simulación local');
      }

      const bounds = L.latLngBounds(route.coords.map((point) => [point.lat, point.lng] as [number, number]));
      this.trackingMap.fitBounds(bounds, { padding: [36, 36], animate: true });
      this.resumeSimulationAnimation();
    } catch {
      this.simulationStatus.set('error');
      this.simulationMessage.set('No se pudo consultar OpenStreetMap/OSRM en este momento.');
    } finally {
      this.simulationLoading.set(false);
    }
  }

  toggleSimulationPause(): void {
    if (this.simulationStatus() === 'running') {
      if (this.simulationFrameId !== null) {
        cancelAnimationFrame(this.simulationFrameId);
        this.simulationFrameId = null;
      }
      this.simulationElapsedBeforePause += performance.now() - this.simulationStartedAt;
      this.simulationStatus.set('paused');
      return;
    }

    if (this.simulationStatus() === 'paused') {
      this.simulationStatus.set('running');
      this.resumeSimulationAnimation();
    }
  }

  resetSimulation(): void {
    this.clearSimulation(true);
  }

  private resumeSimulationAnimation(): void {
    if (this.simulationRoute.length < 2) return;
    this.simulationStartedAt = performance.now();

    const step = (timestamp: number) => {
      if (this.simulationStatus() !== 'running') return;

      const elapsed = this.simulationElapsedBeforePause + timestamp - this.simulationStartedAt;
      const progress = Math.min(elapsed / this.simulationPreviewDurationMs, 1);
      this.renderSimulationProgress(progress);

      if (progress < 1) {
        this.simulationFrameId = requestAnimationFrame(step);
      } else {
        this.simulationFrameId = null;
        this.simulationStatus.set('finished');
        this.simulationMessage.set('Simulación completada. El camión llegó al destino aproximado.');
      }
    };

    this.simulationFrameId = requestAnimationFrame(step);
  }

  private renderSimulationProgress(progress: number): void {
    const point = this.pointOnRoute(progress);
    if (!point) return;

    this.simulationProgressPct.set(progress * 100);
    this.driverMarker?.setLatLng([point.lat, point.lng]);

    const lastIndex = this.simulationRoute.length - 1;
    const exactIndex = progress * lastIndex;
    const baseIndex = Math.max(0, Math.floor(exactIndex));
    const traveled = this.simulationRoute.slice(0, baseIndex + 1).map((routePoint) => [routePoint.lat, routePoint.lng] as [number, number]);
    traveled.push([point.lat, point.lng]);
    this.simulationProgressPolyline?.setLatLngs(traveled);
  }

  private pointOnRoute(progress: number): TrackingPoint | null {
    if (this.simulationRoute.length === 0) return null;
    if (progress >= 1) return this.simulationRoute[this.simulationRoute.length - 1];

    const lastIndex = this.simulationRoute.length - 1;
    const exactIndex = progress * lastIndex;
    const startIndex = Math.floor(exactIndex);
    const endIndex = Math.min(startIndex + 1, lastIndex);
    const localProgress = exactIndex - startIndex;
    const start = this.simulationRoute[startIndex];
    const end = this.simulationRoute[endIndex];

    return {
      lat: start.lat + (end.lat - start.lat) * localProgress,
      lng: start.lng + (end.lng - start.lng) * localProgress,
    };
  }

  private updateSimulationEta(): void {
    const distanceKm = this.simulationDistanceKm();
    const speedKmh = this.simulationSpeedKmh();
    this.simulationEtaMinutes.set(distanceKm > 0 && speedKmh > 0 ? (distanceKm / speedKmh) * 60 : 0);
  }

  private getTrackingDestinationAddress(): string {
    return this.trackingOrder()?.details?.[0]?.deliveryAddress?.trim() ?? '';
  }

  private async geocodeDestination(address: string): Promise<GeocodedDestination | null> {
    const cacheKey = address.trim().toLocaleLowerCase();
    if (this.geocodeCache.has(cacheKey)) return this.geocodeCache.get(cacheKey) ?? null;

    const normalizedQuery = /nicaragua/i.test(address) ? address : `${address}, Nicaragua`;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'ni');
    url.searchParams.set('q', normalizedQuery);

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Nominatim request failed');

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const first = results[0];
    if (!first) {
      this.geocodeCache.set(cacheKey, null);
      return null;
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.geocodeCache.set(cacheKey, null);
      return null;
    }

    const destination: GeocodedDestination = {
      lat,
      lng,
      label: first.display_name || address,
    };
    this.geocodeCache.set(cacheKey, destination);
    return destination;
  }

  private async fetchOsrmRoute(origin: TrackingPoint, destination: TrackingPoint): Promise<RouteResult | null> {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('OSRM request failed');

    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };
    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (data.code !== 'Ok' || !route || !coordinates?.length) return null;

    return {
      coords: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: (route.distance ?? 0) / 1000,
      durationMinutes: (route.duration ?? 0) / 60,
    };
  }

  private clearSimulation(resetMarker: boolean): void {
    if (this.simulationFrameId !== null) {
      cancelAnimationFrame(this.simulationFrameId);
      this.simulationFrameId = null;
    }

    this.simulationRoutePolyline?.remove();
    this.simulationRoutePolyline = null;
    this.simulationProgressPolyline?.remove();
    this.simulationProgressPolyline = null;
    this.destinationMarker?.remove();
    this.destinationMarker = null;
    this.simulationRoute = [];
    this.simulationStartedAt = 0;
    this.simulationElapsedBeforePause = 0;
    this.simulationPreviewDurationMs = 0;
    this.simulationStatus.set('idle');
    this.simulationDistanceKm.set(0);
    this.simulationEtaMinutes.set(0);
    this.simulationProgressPct.set(0);
    this.simulationMessage.set('');
    this.simulationLoading.set(false);

    const location = this.trackingLocation();
    if (resetMarker && location && this.driverMarker) {
      this.driverMarker.setLatLng([location.latitude, location.longitude]);
      this.driverMarker.setIcon(this.createTruckIcon());
    }
  }

  private isSimulationControllingMarker(): boolean {
    return ['running', 'paused', 'finished'].includes(this.simulationStatus());
  }

  private createTruckIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
              <div style="position: relative; width: 52px; height: 52px;">
                <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(99,102,241,0.25); animation: truck-ring 2s ease-out infinite;"></div>
                <div style="position: absolute; inset: 5px; background: linear-gradient(135deg, #3d39af, #6366f1); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(61,57,175,0.6); border: 3px solid white; font-size: 20px;"><i class="fa-solid fa-truck" style="color: white;"></i></div>
              </div>`,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -26],
    });
  }

  private createSimulationTruckIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #0f766e, #10b981); display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 8px 22px rgba(15,118,110,0.45); font-size: 19px;"><i class="fa-solid fa-truck-fast"></i></div>`,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      popupAnchor: [0, -23],
    });
  }

  private createDestinationIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width: 42px; height: 42px; border-radius: 14px 14px 14px 4px; transform: rotate(-45deg); background: #f97316; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 8px 18px rgba(249,115,22,0.35);"><i class="fa-solid fa-flag-checkered" style="transform: rotate(45deg);"></i></div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 36],
      popupAnchor: [0, -36],
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  /** Interpola suavemente el marcador desde prevPos hasta newPos en ~600ms */
  private animateMarkerTo(marker: L.Marker, newLatLng: L.LatLng): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const startLatLng = marker.getLatLng();
    const startTime = performance.now();
    const duration = 600; // ms

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Easing suave (ease-out)
      const eased = 1 - Math.pow(1 - t, 3);

      const lat = startLatLng.lat + (newLatLng.lat - startLatLng.lat) * eased;
      const lng = startLatLng.lng + (newLatLng.lng - startLatLng.lng) * eased;

      marker.setLatLng([lat, lng]);

      if (t < 1) {
        this.animFrameId = requestAnimationFrame(step);
      } else {
        this.animFrameId = null;
      }
    };

    this.animFrameId = requestAnimationFrame(step);
  }

  private fetchAndUpdateDriverMarker(idOrder: number): void {
    this.orderService.getOrderLocation(idOrder).subscribe({
      next: (tracking) => {
        this.ngZone.run(() => {
          const lat = parseFloat(tracking.latitude);
          const lng = parseFloat(tracking.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !this.isFreshTracking(tracking)) {
            this.trackingLocation.set(null);
            this.clearSimulation(false);
            return;
          }
          this.trackingLocation.set({ latitude: lat, longitude: lng });

          const now = new Date();
          this.lastTrackingUpdate.set(
            now.toLocaleTimeString('es-NI', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
          );

          if (!this.trackingMap) return;

          const newLatLng = L.latLng(lat, lng);

          // Agregar punto a la ruta recorrida
          // Bug #1 fix: routeCoords guarda arrays [lat, lng], acceder con índice directo
          const lastCoord = this.routeCoords[this.routeCoords.length - 1] as
            | [number, number]
            | undefined;
          const isDifferent =
            !lastCoord ||
            Math.abs(lastCoord[0] - lat) > 0.00001 ||
            Math.abs(lastCoord[1] - lng) > 0.00001;

          if (isDifferent) {
            this.routeCoords.push([lat, lng]);
            this.routePolyline?.setLatLngs(this.routeCoords);
          }

          if (this.isSimulationControllingMarker()) return;

          // Icono del camion con anillo de pulso animado
          const truckIcon = this.createTruckIcon();

          if (this.driverMarker) {
            // Mover el marcador de forma animada y suave
            this.animateMarkerTo(this.driverMarker, newLatLng);
            // Bug #3 fix: actualizar el ícono en cada ciclo para mantener la animación
            this.driverMarker.setIcon(truckIcon);
          } else {
            // Crear el marcador del conductor por primera vez
            this.driverMarker = L.marker(newLatLng, { icon: truckIcon })
              .addTo(this.trackingMap)
              .bindPopup('<strong>Conductor</strong><br>Ubicación en tiempo real');
            // Primer punto de la ruta
            this.routeCoords.push([lat, lng]);
            this.routePolyline?.setLatLngs(this.routeCoords);
          }

          // Seguir al conductor en el mapa suavemente
          this.trackingMap.panTo(newLatLng, { animate: true, duration: 0.8 });
        });
      },
      error: () => {
        // No hay ubicación disponible todavía, no hacemos nada
      },
    });
  }

  private isFreshTracking(tracking: any): boolean {
    const updatedAt = tracking?.updatedAt || tracking?.createdAt;
    if (!updatedAt) return true;
    const timestamp = new Date(updatedAt).getTime();
    return Number.isFinite(timestamp) && Date.now() - timestamp <= this.trackingMaxAgeMs;
  }

  private destroyTrackingMap(): void {
    this.clearSimulation(false);
    this.trackingPollSub?.unsubscribe();
    this.trackingPollSub = undefined;

    // Cancelar animación pendiente
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.driverMarker) {
      this.driverMarker.remove();
      this.driverMarker = null;
    }
    if (this.destinationMarker) {
      this.destinationMarker.remove();
      this.destinationMarker = null;
    }
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }
    if (this.trackingMap) {
      this.trackingMap.remove();
      this.trackingMap = null;
    }
    // Reset estado de ruta
    this.routeCoords = [];
    this.prevLatLng = null;
  }
}
