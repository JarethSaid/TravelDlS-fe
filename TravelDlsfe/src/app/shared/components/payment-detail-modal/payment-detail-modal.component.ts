import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type DetailPayment = {
  idPayment: number;
  idOrder: number;
  idClient: number;
  idCompany: number;
  amount: number;
  status: string;
  method: string;
  billingEmail?: string | null;
  cardHolderName?: string | null;
  cardBrand?: string | null;
  last4?: string | null;
  transferReference?: string | null;
  referenceCode: string;
  cancellationReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  order?: { idOrder: number; status: string } | null;
  client?: { companyName?: string; user?: { name?: string; email?: string } } | null;
  company?: { businessName?: string } | null;
};

@Component({
  selector: 'app-payment-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (payment) {
      <div class="modal-backdrop" (click)="closed.emit()"></div>
      <section class="payment-detail-modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <span class="eyebrow">Detalle de pago</span>
            <h2>Pago #{{ payment.idPayment }}</h2>
            <p>Orden #{{ payment.idOrder }} - {{ payment.referenceCode }}</p>
          </div>
          <button type="button" class="icon-button" title="Cerrar" (click)="closed.emit()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div class="modal-body">
          <div class="amount-panel">
            <span>Monto pagado</span>
            <strong>C$ {{ payment.amount | number: '1.2-2' }}</strong>
            <div class="chip-row">
              <span [class]="statusClass(payment.status)">{{ paymentStatusLabel(payment.status) }}</span>
              <span [class]="orderStatusClass(payment.order?.status)">{{ orderStatusLabel(payment.order?.status) }}</span>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span>Metodo</span>
              <strong>{{ methodLabel(payment) }}</strong>
            </div>
            <div class="detail-item">
              <span>Referencia</span>
              <strong>{{ payment.referenceCode }}</strong>
            </div>
            <div class="detail-item">
              <span>Fecha</span>
              <strong>{{ (payment.paidAt || payment.createdAt) | date: 'dd/MM/yyyy HH:mm' }}</strong>
            </div>
            <div class="detail-item">
              <span>Email de facturacion</span>
              <strong>{{ payment.billingEmail || 'No disponible' }}</strong>
            </div>
            <div class="detail-item">
              <span>Cliente</span>
              <strong>{{ clientName(payment) }}</strong>
            </div>
            <div class="detail-item">
              <span>Empresa</span>
              <strong>{{ payment.company?.businessName || ('Empresa #' + payment.idCompany) }}</strong>
            </div>
          </div>

          @if (payment.cancellationReason) {
            <div class="reason-box">
              <span>Motivo de cancelacion</span>
              <p>{{ payment.cancellationReason }}</p>
            </div>
          }
        </div>

        <footer class="modal-footer">
          <button type="button" class="close-button" (click)="closed.emit()">Cerrar</button>
        </footer>
      </section>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(15, 23, 42, 0.55);
    }

    .payment-detail-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 1101;
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      transform: translate(-50%, -50%);
      overflow: hidden;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
    }

    .modal-header,
    .modal-footer {
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }

    .modal-footer {
      border-top: 1px solid #e2e8f0;
      border-bottom: none;
      justify-content: flex-end;
    }

    .eyebrow {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2 {
      margin: 3px 0 4px;
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
    }

    .modal-header p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
    }

    .icon-button,
    .close-button {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 800;
    }

    .icon-button {
      width: 36px;
      height: 36px;
      background: #f1f5f9;
      color: #475569;
    }

    .close-button {
      padding: 10px 18px;
      background: #3d39af;
      color: white;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
    }

    .amount-panel {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      padding: 18px;
      margin-bottom: 16px;
    }

    .amount-panel span,
    .detail-item span,
    .reason-box span {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .amount-panel strong {
      display: block;
      margin-top: 6px;
      color: #3d39af;
      font-size: 30px;
      font-weight: 900;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
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

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .detail-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }

    .detail-item strong {
      display: block;
      margin-top: 5px;
      color: #0f172a;
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .reason-box {
      margin-top: 14px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fff7f7;
      padding: 14px;
    }

    .reason-box p {
      margin: 8px 0 0;
      color: #7f1d1d;
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }

      .modal-header,
      .modal-footer,
      .modal-body {
        padding: 16px;
      }
    }
  `],
})
export class PaymentDetailModalComponent {
  @Input() payment: DetailPayment | null = null;
  @Output() closed = new EventEmitter<void>();

  methodLabel(payment: DetailPayment): string {
    if (payment.method === 'transfer') return 'Transferencia';
    return payment.cardBrand && payment.last4 ? `${payment.cardBrand} **** ${payment.last4}` : 'Tarjeta';
  }

  clientName(payment: DetailPayment): string {
    return payment.client?.companyName || payment.client?.user?.name || `Cliente #${payment.idClient}`;
  }

  paymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      pagado: 'Pagado',
      fallido: 'Fallido',
      cancelado: 'Cancelado',
    };
    return map[status] ?? status;
  }

  orderStatusLabel(status?: string | null): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      esperando_aprobacion: 'Esperando aprobacion',
      aceptado: 'Aceptado',
      en_transito: 'En transito',
      entregado: 'Entregado',      cancelado: 'Cancelado',
      anulado: 'Anulada',
      denegado: 'Denegado',
    };
    return status ? map[status] ?? status : 'Orden no disponible';
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pagado: 'status-chip status-paid',
      pendiente: 'status-chip status-pending',
      fallido: 'status-chip status-failed',
      cancelado: 'status-chip status-cancelled',
    };
    return map[status] ?? 'status-chip status-pending';
  }

  orderStatusClass(status?: string | null): string {
    if (status === 'entregado') return 'status-chip status-delivered';
    if (status === 'en_transito') return 'status-chip status-transit';
    if (status === 'cancelado' || status === 'anulado' || status === 'denegado') return 'status-chip status-cancelled';
    if (status === 'confirmado' || status === 'aceptado') return 'status-chip status-confirmed';
    return 'status-chip status-unknown';
  }
}