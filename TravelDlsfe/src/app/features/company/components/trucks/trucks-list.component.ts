import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruckService } from '../../../platformAdmin/services/truck.service';
import { Truck } from '../../../platformAdmin/interface/truck.interface';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-trucks-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Camiones</h1>
          <p class="page-sub">{{ total() }} camiones en tu flota</p>
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
              placeholder="Buscar por placa o chasis…"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch()"
            />
          </div>
        </div>

        <div class="tabla-contenedor" style="border-radius:0; border:none; box-shadow:none;">
          <table class="tabla-resort">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Chasis</th>
                <th>Conductor</th>
                <th>Categoría</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="5" class="tabla-vacia"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>
              } @else if (trucks().length === 0) {
                <tr>
                  <td colspan="5">
                    <div class="empty-state-company">
                      <div class="empty-state-icon"><i class="fa-solid fa-truck"></i></div>
                      <p class="empty-state-text">No hay camiones registrados en tu flota</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (t of trucks(); track t.idTruck) {
                  <tr>
                    <td class="txt-negrita">{{ t.plate }}</td>
                    <td>{{ t.chassis }}</td>
                    <td>{{ t.driver?.user?.name ?? '—' }}</td>
                    <td>{{ t.category?.nameCategory ?? '—' }}</td>
                    <td>
                      <span [class]="t.deletedAt ? 'badge-estado badge-inactivo' : 'badge-estado badge-activo'">
                        {{ t.deletedAt ? 'Inactivo' : 'Activo' }}
                      </span>
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
export class TrucksListComponent implements OnInit {
  private readonly svc = inject(TruckService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  trucks = signal<Truck[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = '';

  private companyId: number | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.companyId = this.auth.user()?.idCompany ?? null;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({
      page: this.currentPage(),
      perPage: 10,
      search: this.searchTerm || undefined,
      idCompany: this.companyId ?? undefined,
    }).subscribe({
      next: (res) => {
        this.trucks.set(res.data);
        this.total.set(res.meta.total);
        this.totalPages.set(res.meta.lastPage);
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
}
