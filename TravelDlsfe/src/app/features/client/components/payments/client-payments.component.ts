import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { PaymentDetailModalComponent } from '../../../../shared/components/payment-detail-modal/payment-detail-modal.component';
import { Payment, PaymentMethod, PaymentStatus } from '../../interface/client.interface';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentDetailModalComponent],
  template: `
    <div class="payments-page">
      <div class="page-header">
        <div>
          <h1>Mis Pagos</h1>
          <p class="subtitle">Consulta tus pagos registrados y cancela los que aun aplican.</p>
        </div>
      </div>

      <div class="payments-card">
        <div class="payments-toolbar">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Buscar por referencia..."
              [(ngModel)]="searchTerm"
              (input)="onSearch()"
            />
          </div>

          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="reloadFromFirstPage()">
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select class="filter-select" [(ngModel)]="methodFilter" (ngModelChange)="reloadFromFirstPage()">
            <option value="">Todos los metodos</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>

        <div class="summary-row">
          <div class="summary-item">
            <span>Pagos</span>
            <strong>{{ total() }}</strong>
          </div>
          <div class="summary-item">
            <span>{{ totalAmountLabel() }}</span>
            <strong>C$ {{ pageAmount() | number: '1.2-2' }}</strong>
          </div>
          <div class="summary-item">
            <span>Cancelables</span>
            <strong>{{ cancellableCount() }}</strong>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="payments-table">
            <thead>
              <tr>
                <th># Pago</th>
                <th>Orden</th>
                <th>Monto</th>
                <th>Metodo</th>
                <th>Referencia</th>
                <th>Pago</th>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="9" class="empty-cell">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando pagos...
                  </td>
                </tr>
              } @else if (payments().length === 0) {
                <tr>
                  <td colspan="9">
                    <div class="empty-state">
                      <div class="empty-icon"><i class="fa-solid fa-receipt"></i></div>
                      <h3>No hay pagos registrados</h3>
                      <p>Cuando realices pagos, apareceran aqui para que puedas consultarlos.</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (payment of payments(); track payment.idPayment) {
                  <tr>
                    <td class="strong-cell">#{{ payment.idPayment }}</td>
                    <td>#{{ payment.idOrder }}</td>
                    <td class="amount-cell">C$ {{ payment.amount | number: '1.2-2' }}</td>
                    <td>
                      <span class="method-chip">
                        <i [class]="methodIcon(payment.method)"></i>
                        {{ methodLabel(payment) }}
                      </span>
                    </td>
                    <td><span class="reference-code">{{ payment.referenceCode }}</span></td>
                    <td><span [class]="paymentStatusClass(payment.status)">{{ paymentStatusLabel(payment.status) }}</span></td>
                    <td><span [class]="orderStatusClass(payment.order?.status)">{{ orderStatusLabel(payment.order?.status) }}</span></td>
                    <td>{{ (payment.paidAt || payment.createdAt) | date: 'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn-view-payment" type="button" title="Ver detalle" (click)="selectedDetailPayment.set(payment)">
                          <i class="fa-regular fa-eye"></i>
                          <span>Ver detalle</span>
                        </button>
                        <button
                          class="btn-cancel-payment"
                          type="button"
                          [disabled]="!canCancel(payment) || cancelingId() === payment.idPayment"
                          [title]="cancelReason(payment)"
                          (click)="cancelPayment(payment)"
                        >
                          @if (cancelingId() === payment.idPayment) {
                            <i class="fa-solid fa-spinner fa-spin"></i>
                          } @else {
                            <i class="fa-solid fa-ban"></i>
                          }
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <span>{{ rangeLabel() }}</span>
          <div class="pagination-actions">
            <button class="page-btn" [disabled]="currentPage() <= 1 || loading()" (click)="goPage(currentPage() - 1)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <strong>{{ currentPage() }} / {{ totalPages() }}</strong>
            <button class="page-btn" [disabled]="currentPage() >= totalPages() || loading()" (click)="goPage(currentPage() + 1)">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

      @if (selectedDetailPayment()) {
        <app-payment-detail-modal
          [payment]="selectedDetailPayment()"
          (closed)="selectedDetailPayment.set(null)"
        />
      }

      @if (cancelPaymentTarget()) {
        <div class="cancel-backdrop" (click)="closeCancelModal()"></div>
        <section class="cancel-modal" role="dialog" aria-modal="true">
          <header class="cancel-modal-header">
            <div>
              <span>Cancelacion de pago</span>
              <h2>Pago #{{ cancelPaymentTarget()!.idPayment }}</h2>
              <p>Orden #{{ cancelPaymentTarget()!.idOrder }}</p>
            </div>
            <button type="button" class="cancel-close" title="Cerrar" (click)="closeCancelModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div class="cancel-modal-body">
            <label for="cancelReason">Motivo de cancelacion *</label>
            <textarea
              id="cancelReason"
              rows="5"
              maxlength="500"
              placeholder="Describe por que necesitas cancelar este pago..."
              [(ngModel)]="cancellationReason"
            ></textarea>
            <small>{{ cancellationReason.trim().length }}/500 - minimo 5 caracteres</small>
          </div>

          <footer class="cancel-modal-footer">
            <button type="button" class="btn-cancel-secondary" (click)="closeCancelModal()" [disabled]="!!cancelingId()">
              Volver
            </button>
            <button
              type="button"
              class="btn-cancel-confirm"
              [disabled]="!isCancellationReasonValid() || !!cancelingId()"
              (click)="confirmCancelPayment()"
            >
              @if (cancelingId()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Cancelando...
              } @else {
                <i class="fa-solid fa-ban"></i> Confirmar cancelacion
              }
            </button>
          </footer>
        </section>
      }
  `,
  styles: [`
    .payments-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .page-header h1 {
      margin: 0;
      color: #0f172a;
      font-size: 28px;
      font-weight: 800;
    }

    .subtitle {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .payments-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
    }

    .payments-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .search-box {
      flex: 1 1 320px;
      min-width: 220px;
      position: relative;
    }

    .search-box i {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 14px;
    }

    .search-box input,
    .filter-select {
      width: 100%;
      height: 42px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #1e293b;
      font: inherit;
      font-size: 14px;
      box-sizing: border-box;
    }

    .search-box input {
      padding: 0 14px 0 40px;
    }

    .filter-select {
      flex: 0 0 190px;
      padding: 0 12px;
      cursor: pointer;
    }

    .search-box input:focus,
    .filter-select:focus {
      outline: none;
      border-color: #3d39af;
      background: white;
      box-shadow: 0 0 0 3px rgba(61, 57, 175, 0.12);
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .summary-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .summary-item span {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .summary-item strong {
      color: #3d39af;
      font-size: 22px;
      font-weight: 800;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .payments-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 980px;
    }

    .payments-table th,
    .payments-table td {
      padding: 13px 14px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 13px;
      vertical-align: middle;
    }

    .payments-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .payments-table tr:last-child td {
      border-bottom: none;
    }

    .strong-cell,
    .amount-cell {
      font-weight: 800;
      color: #3d39af;
    }

    .method-chip,
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .method-chip {
      background: #eef2ff;
      color: #3730a3;
    }

    .status-paid,
    .status-delivered {
      background: #dcfce7;
      color: #166534;
    }

    .status-pending,
    .status-confirmed,
    .status-unknown {
      background: #fef3c7;
      color: #92400e;
    }

    .status-cancelled,
    .status-failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-transit {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .reference-code {
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }


    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-view-payment {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 112px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #e0f2fe;
      color: #075985;
      cursor: pointer;
      font-weight: 800;
      font-size: 12px;
    }

    .btn-view-payment:hover {
      background: #bae6fd;
    }

    .cancel-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(15, 23, 42, 0.55);
    }

    .cancel-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 1101;
      width: min(560px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      border-radius: 8px;
      background: white;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
      overflow: hidden;
    }

    .cancel-modal-header,
    .cancel-modal-footer {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
    }

    .cancel-modal-footer {
      border-top: 1px solid #e2e8f0;
      border-bottom: none;
      justify-content: flex-end;
    }

    .cancel-modal-header span {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .cancel-modal-header h2 {
      margin: 4px 0;
      color: #0f172a;
      font-size: 22px;
    }

    .cancel-modal-header p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
    }

    .cancel-close {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      color: #475569;
      cursor: pointer;
    }

    .cancel-modal-body {
      padding: 20px;
    }

    .cancel-modal-body label {
      display: block;
      margin-bottom: 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 800;
    }

    .cancel-modal-body textarea {
      width: 100%;
      resize: vertical;
      min-height: 120px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      font: inherit;
      font-size: 14px;
      box-sizing: border-box;
    }

    .cancel-modal-body textarea:focus {
      outline: none;
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }

    .cancel-modal-body small {
      display: block;
      margin-top: 7px;
      color: #64748b;
      font-size: 12px;
    }

    .btn-cancel-secondary,
    .btn-cancel-confirm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 40px;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      cursor: pointer;
      font-weight: 800;
    }

    .btn-cancel-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-cancel-confirm {
      background: #dc2626;
      color: white;
    }

    .btn-cancel-secondary:disabled,
    .btn-cancel-confirm:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-cancel-payment {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 112px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #fee2e2;
      color: #b91c1c;
      cursor: pointer;
      font-weight: 800;
      font-size: 12px;
    }

    .btn-cancel-payment:not(:disabled):hover {
      background: #fecaca;
    }

    .btn-cancel-payment:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .empty-cell,
    .empty-state {
      text-align: center;
      color: #64748b;
    }

    .empty-state {
      padding: 36px 18px;
    }

    .empty-icon {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #eef2ff;
      color: #3d39af;
      display: grid;
      place-items: center;
      margin: 0 auto 12px;
      font-size: 22px;
    }

    .empty-state h3 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 16px;
    }

    .empty-state p {
      margin: 0;
      font-size: 13px;
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 16px;
      color: #64748b;
      font-size: 13px;
    }

    .pagination-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pagination-actions strong {
      color: #334155;
      min-width: 52px;
      text-align: center;
    }

    .page-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #475569;
      cursor: pointer;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 760px) {
      .payments-card {
        padding: 14px;
      }

      .summary-row {
        grid-template-columns: 1fr;
      }

      .filter-select {
        flex: 1 1 100%;
      }

      .pagination-bar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
})
export class ClientPaymentsComponent implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly ui = inject(InteractionService);

  readonly payments = signal<Payment[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly summaryAmount = signal(0);
  readonly cancelingId = signal<number | null>(null);
  readonly selectedDetailPayment = signal<Payment | null>(null);
  readonly cancelPaymentTarget = signal<Payment | null>(null);

  searchTerm = '';
  statusFilter = '';
  methodFilter = '';
  cancellationReason = '';
  perPage = 10;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly pageAmount = computed(() => this.summaryAmount());

  readonly cancellableCount = computed(() => this.payments().filter((payment) => this.canCancel(payment)).length);

  private totalPaymentStatus(): PaymentStatus {
    return this.statusFilter === 'cancelado' ? 'cancelado' : 'pagado';
  }

  totalAmountLabel(): string {
    return this.statusFilter === 'cancelado' ? 'Total cancelado' : 'Total pagado';
  }

  private pageFallbackAmount(payments: Payment[]): number {
    return payments
      .filter((payment) => payment.status === this.totalPaymentStatus())
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.clientService
      .getPayments({
        page: this.currentPage(),
        perPage: this.perPage,
        status: this.statusFilter || undefined,
        summaryStatus: this.totalPaymentStatus(),
        method: this.methodFilter || undefined,
        search: this.searchTerm.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];
          this.payments.set(data);
          this.total.set(res.meta?.total ?? data.length);
          this.totalPages.set(res.meta?.lastPage ?? 1);
          this.summaryAmount.set(Number(res.summary?.totalAmount ?? this.pageFallbackAmount(data)));
          this.loading.set(false);
        },
        error: (err) => {
          this.ui.showToast(getHttpErrorMessage(err), 'error');
          this.loading.set(false);
        },
      });
  }

  reloadFromFirstPage(): void {
    this.currentPage.set(1);
    this.load();
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.reloadFromFirstPage(), 350);
  }

  goPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.load();
  }

  cancelPayment(payment: Payment): void {
    if (!this.canCancel(payment) || this.cancelingId()) return;
    this.cancellationReason = '';
    this.cancelPaymentTarget.set(payment);
  }

  closeCancelModal(): void {
    if (this.cancelingId()) return;
    this.cancelPaymentTarget.set(null);
    this.cancellationReason = '';
  }

  isCancellationReasonValid(): boolean {
    const length = this.cancellationReason.trim().length;
    return length >= 5 && length <= 500;
  }

  confirmCancelPayment(): void {
    const payment = this.cancelPaymentTarget();
    const reason = this.cancellationReason.trim();
    if (!payment || !this.canCancel(payment) || !this.isCancellationReasonValid() || this.cancelingId()) return;

    this.cancelingId.set(payment.idPayment);
    this.clientService.cancelPayment(payment.idPayment, reason).subscribe({
      next: () => {
        this.ui.showToast('Pago cancelado correctamente', 'success');
        this.cancelingId.set(null);
        this.cancelPaymentTarget.set(null);
        this.cancellationReason = '';
        this.load();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.cancelingId.set(null);
      },
    });
  }

  canCancel(payment: Payment): boolean {
    const orderStatus = payment.order?.status;
    return !!orderStatus && payment.status !== 'cancelado' && orderStatus !== 'entregado' && orderStatus !== 'en_transito';
  }

  cancelReason(payment: Payment): string {
    const orderStatus = payment.order?.status;
    if (payment.status === 'cancelado') return 'Este pago ya esta cancelado';
    if (!orderStatus) return 'No se encontro el estado de la orden';
    if (orderStatus === 'entregado') return 'No se puede cancelar porque la orden esta entregada';
    if (orderStatus === 'en_transito') return 'No se puede cancelar porque la orden esta en transito';
    return 'Cancelar pago';
  }

  rangeLabel(): string {
    if (this.total() === 0) return 'Mostrando 0 - 0 de 0 pagos';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `Mostrando ${start} - ${end} de ${this.total()} pagos`;
  }

  methodLabel(payment: Payment): string {
    if (payment.method === 'transfer') return 'Transferencia';
    return payment.cardBrand && payment.last4 ? `${payment.cardBrand} **** ${payment.last4}` : 'Tarjeta';
  }

  methodIcon(method: PaymentMethod): string {
    return method === 'transfer' ? 'fa-solid fa-building-columns' : 'fa-regular fa-credit-card';
  }

  paymentStatusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      pendiente: 'Pendiente',
      pagado: 'Pagado',
      fallido: 'Fallido',
      cancelado: 'Cancelado',
    };
    return map[status] ?? status;
  }

  paymentStatusClass(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      pagado: 'status-chip status-paid',
      pendiente: 'status-chip status-pending',
      fallido: 'status-chip status-failed',
      cancelado: 'status-chip status-cancelled',
    };
    return map[status] ?? 'status-chip status-pending';
  }

  orderStatusLabel(status?: string | null): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      esperando_aprobacion: 'Esperando aprobacion',
      aceptado: 'Aceptado',
      en_transito: 'En transito',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      anulado: 'Anulada',
      denegado: 'Denegado',
    };
    return status ? map[status] ?? status : 'No disponible';
  }

  orderStatusClass(status?: string | null): string {
    if (status === 'entregado') return 'status-chip status-delivered';
    if (status === 'en_transito') return 'status-chip status-transit';
    if (status === 'cancelado' || status === 'anulado' || status === 'denegado') return 'status-chip status-cancelled';
    if (status === 'confirmado' || status === 'aceptado') return 'status-chip status-confirmed';
    return 'status-chip status-unknown';
  }
}