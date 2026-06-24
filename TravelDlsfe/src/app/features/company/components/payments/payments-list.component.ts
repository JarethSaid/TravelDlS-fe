import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

type PaymentMethod = 'card' | 'transfer';
type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'cancelado';

interface CompanyPayment {
  idPayment: number;
  idOrder: number;
  idClient: number;
  idCompany: number;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  billingEmail: string;
  cardHolderName: string | null;
  cardBrand: string | null;
  last4: string | null;
  transferReference: string | null;
  referenceCode: string;
  paidAt: string | null;
  createdAt: string;
  client?: { companyName?: string; user?: { name?: string; email?: string } };
}

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pagos</h1>
          <p class="page-sub">{{ total() }} pagos registrados</p>
        </div>
      </div>

      <div class="company-content-card">
        <div class="company-toolbar payments-toolbar">
          <div class="company-search-box payments-search">
            <i class="fa-solid fa-magnifying-glass company-search-icon"></i>
            <input
              class="company-search-input"
              type="text"
              placeholder="Buscar por referencia o pedido..."
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

        <div class="payments-summary-row">
          <div class="payments-summary-card">
            <span>Total cobrado</span>
            <strong>C$ {{ totalAmount() | number: '1.2-2' }}</strong>
          </div>
          <div class="payments-summary-card">
            <span>Pagos con tarjeta</span>
            <strong>{{ cardPayments() }}</strong>
          </div>
          <div class="payments-summary-card">
            <span>Transferencias</span>
            <strong>{{ transferPayments() }}</strong>
          </div>
        </div>

        <div class="tabla-contenedor payments-table-wrap">
          <table class="tabla-resort">
            <thead>
              <tr>
                <th># Pago</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Metodo</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="8" class="tabla-vacia">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando pagos...
                  </td>
                </tr>
              } @else if (payments().length === 0) {
                <tr>
                  <td colspan="8">
                    <div class="empty-state-company">
                      <div class="empty-state-icon"><i class="fa-solid fa-receipt"></i></div>
                      <p class="empty-state-text">No hay pagos registrados</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (payment of payments(); track payment.idPayment) {
                  <tr>
                    <td class="txt-negrita">#{{ payment.idPayment }}</td>
                    <td>#{{ payment.idOrder }}</td>
                    <td>{{ clientName(payment) }}</td>
                    <td class="payment-amount">C$ {{ payment.amount | number: '1.2-2' }}</td>
                    <td>
                      <span class="payment-method-chip">
                        <i [class]="methodIcon(payment.method)"></i>
                        {{ methodLabel(payment) }}
                      </span>
                    </td>
                    <td>
                      <span class="payment-reference">{{ payment.referenceCode }}</span>
                    </td>
                    <td><span [class]="statusBadgeClass(payment.status)">{{ statusLabel(payment.status) }}</span></td>
                    <td>{{ (payment.paidAt || payment.createdAt) | date: 'dd/MM/yyyy' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="paginacion-estandar company-list-pagination payments-pagination">
          <span class="pag-rango">{{ rangeLabel() }}</span>
          <div class="pag-controles">
            <button class="btn-pag" [disabled]="currentPage() <= 1 || loading()" (click)="goPage(currentPage() - 1)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button class="btn-pag" [disabled]="currentPage() >= totalPages() || loading()" (click)="goPage(currentPage() + 1)">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .payments-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    .payments-search {
      flex: 1 1 320px;
      max-width: 620px;
    }

    .payments-summary-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }

    .payments-summary-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .payments-summary-card span {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .payments-summary-card strong {
      color: #3d39af;
      font-size: 22px;
      font-weight: 800;
    }

    .payments-table-wrap {
      border-radius: 0;
      border: none;
      box-shadow: none;
    }

    .payment-amount {
      color: #3d39af;
      font-weight: 800;
    }

    .payment-method-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 12px;
      font-weight: 800;
    }

    .payment-reference {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #475569;
      font-size: 12px;
    }

    @media (max-width: 760px) {
      .payments-summary-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PaymentsListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  readonly payments = signal<CompanyPayment[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);

  searchTerm = '';
  statusFilter = '';
  methodFilter = '';
  perPage = 10;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly totalAmount = computed(() =>
    this.payments().reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  readonly cardPayments = computed(() => this.payments().filter((p) => p.method === 'card').length);
  readonly transferPayments = computed(
    () => this.payments().filter((p) => p.method === 'transfer').length
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.currentPage())
      .set('perPage', this.perPage);

    const companyId = this.auth.user()?.idCompany;
    if (companyId) params = params.set('idCompany', companyId);
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    if (this.methodFilter) params = params.set('method', this.methodFilter);
    if (this.searchTerm.trim()) params = params.set('search', this.searchTerm.trim());

    this.orderService.getPayments(params).subscribe({
      next: (res) => {
        const data = (res.data ?? []) as CompanyPayment[];
        this.payments.set(data);
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

  reloadFromFirstPage(): void {
    this.currentPage.set(1);
    this.load();
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.reloadFromFirstPage(), 350);
  }

  goPage(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  rangeLabel(): string {
    if (this.total() === 0) return 'Mostrando 0 - 0 de 0 pagos';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `Mostrando ${start} - ${end} de ${this.total()} pagos`;
  }

  clientName(payment: CompanyPayment): string {
    return payment.client?.companyName || payment.client?.user?.name || `Cliente #${payment.idClient}`;
  }

  methodLabel(payment: CompanyPayment): string {
    if (payment.method === 'transfer') return 'Transferencia';
    return payment.cardBrand && payment.last4
      ? `${payment.cardBrand} **** ${payment.last4}`
      : 'Tarjeta';
  }

  methodIcon(method: PaymentMethod): string {
    return method === 'transfer' ? 'fa-solid fa-building-columns' : 'fa-regular fa-credit-card';
  }

  statusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      pendiente: 'Pendiente',
      pagado: 'Pagado',
      fallido: 'Fallido',
      cancelado: 'Cancelado',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      pagado: 'badge-resort badge-aceptado',
      pendiente: 'badge-resort badge-pendiente',
      fallido: 'badge-resort badge-cancelada',
      cancelado: 'badge-resort badge-cancelada',
    };
    return map[status] ?? 'badge-resort badge-pendiente';
  }
}
