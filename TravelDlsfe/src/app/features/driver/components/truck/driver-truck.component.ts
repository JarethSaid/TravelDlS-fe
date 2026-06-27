import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DriverService, AssignedTruck } from '../../services/driver.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-driver-truck',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="truck-page">
      <header class="truck-header">
        <div>
          <h1>Mi Camion</h1>
          <p>Consulta el camion asignado y reporta mantenimiento cuando sea necesario.</p>
        </div>
        <button class="btn-refresh" type="button" (click)="loadTruck()" [disabled]="loading()">
          <i class="fa-solid fa-rotate-right" [class.fa-spin]="loading()"></i>
        </button>
      </header>

      @if (loading()) {
        <section class="truck-card truck-card--center">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Cargando camion asignado...</span>
        </section>
      } @else if (!truck()) {
        <section class="truck-card truck-card--empty">
          <div class="empty-icon"><i class="fa-solid fa-truck-ramp-box"></i></div>
          <h2>No tienes camion asignado</h2>
          <p>Cuando tu empresa te asigne un camion, aparecera en este apartado.</p>
        </section>
      } @else {
        <section class="truck-card">
          <div class="truck-card__top">
            <div class="truck-icon"><i class="fa-solid fa-truck-fast"></i></div>
            <div>
              <span class="eyebrow">Camion asignado</span>
              <h2>{{ truck()!.plate }}</h2>
            </div>
            <span [class]="statusClass(truck()!.status)">{{ statusLabel(truck()!.status) }}</span>
          </div>

          <div class="truck-grid">
            <div class="info-item">
              <span>Chasis</span>
              <strong>{{ truck()!.chassis }}</strong>
            </div>
            <div class="info-item">
              <span>Categoria</span>
              <strong>{{ truck()!.category?.nameCategory || 'Sin categoria' }}</strong>
            </div>
            <div class="info-item">
              <span>Conductor</span>
              <strong>{{ truck()!.driver?.user?.name || 'Conductor asignado' }}</strong>
            </div>
            <div class="info-item">
              <span>Estado operativo</span>
              <strong>{{ statusLabel(truck()!.status) }}</strong>
            </div>
          </div>

          <div class="truck-actions">
            <button
              class="btn-maintenance"
              type="button"
              (click)="reportDamage()"
              [disabled]="reporting() || isMaintenance(truck()!.status)"
            >
              <i class="fa-solid fa-screwdriver-wrench"></i>
              {{ reporting() ? 'Reportando...' : isMaintenance(truck()!.status) ? 'Ya esta en mantenimiento' : 'Reportar daño' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .truck-page { display: flex; flex-direction: column; gap: 22px; }
    .truck-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .truck-header h1 { margin: 0; color: #1e293b; font-size: 26px; font-weight: 800; }
    .truck-header p { margin: 6px 0 0; color: #64748b; font-size: 14px; }
    .btn-refresh { width: 42px; height: 42px; border-radius: 10px; border: 1.5px solid #dbeafe; background: white; color: #3d39af; cursor: pointer; }
    .truck-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 26px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04); }
    .truck-card--center, .truck-card--empty { min-height: 260px; display: grid; place-items: center; text-align: center; color: #64748b; }
    .truck-card--center { gap: 10px; align-content: center; }
    .empty-icon { width: 64px; height: 64px; border-radius: 16px; background: #f1f5f9; color: #94a3b8; display: grid; place-items: center; font-size: 26px; margin: 0 auto 14px; }
    .truck-card--empty h2 { margin: 0 0 8px; color: #1e293b; }
    .truck-card--empty p { margin: 0; max-width: 420px; }
    .truck-card__top { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .truck-icon { width: 56px; height: 56px; border-radius: 14px; background: #e0e7ff; color: #3d39af; display: grid; place-items: center; font-size: 22px; }
    .eyebrow { color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .truck-card__top h2 { margin: 3px 0 0; color: #0f172a; font-size: 28px; }
    .truck-status { margin-left: auto; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 800; }
    .truck-status--active { background: #dcfce7; color: #166534; }
    .truck-status--maintenance { background: #ffedd5; color: #c2410c; }
    .truck-status--inactive { background: #fee2e2; color: #991b1b; }
    .truck-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
    .info-item { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; display: flex; flex-direction: column; gap: 6px; }
    .info-item span { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .info-item strong { color: #1e293b; font-size: 15px; }
    .truck-actions { display: flex; justify-content: flex-end; margin-top: 22px; }
    .btn-maintenance { min-height: 44px; border: none; border-radius: 12px; padding: 0 18px; display: inline-flex; align-items: center; gap: 10px; background: #f97316; color: white; font-weight: 800; cursor: pointer; }
    .btn-maintenance:disabled { opacity: 0.55; cursor: not-allowed; }
    @media (max-width: 640px) { .truck-header, .truck-card__top, .truck-actions { align-items: stretch; flex-direction: column; } .truck-status { margin-left: 0; width: fit-content; } }
  `],
})
export class DriverTruckComponent implements OnInit {
  private readonly driverService = inject(DriverService);
  private readonly ui = inject(InteractionService);

  readonly truck = signal<AssignedTruck | null>(null);
  readonly loading = signal(true);
  readonly reporting = signal(false);

  ngOnInit(): void {
    this.loadTruck();
  }

  loadTruck(): void {
    this.loading.set(true);
    this.driverService.getAssignedTruck().subscribe({
      next: (truck) => {
        this.truck.set(truck);
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.status === 404) this.truck.set(null);
        else this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.loading.set(false);
      },
    });
  }

  async reportDamage(): Promise<void> {
    const truck = this.truck();
    if (!truck || this.reporting() || this.isMaintenance(truck.status)) return;

    const confirmed = await this.ui.confirmar('Reportar daño', `Marcar el camion ${truck.plate} como mantenimiento?`);
    if (!confirmed) return;

    this.reporting.set(true);
    this.driverService.reportTruckMaintenance().subscribe({
      next: (updatedTruck) => {
        this.truck.set(updatedTruck);
        this.reporting.set(false);
        this.ui.showToast('Camion reportado en mantenimiento', 'success');
      },
      error: (err) => {
        this.reporting.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  statusLabel(status?: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active' || normalized === 'activo') return 'Activo';
    if (normalized === 'maintenance' || normalized === 'mantenimiento') return 'Mantenimiento';
    if (normalized === 'inactive' || normalized === 'inactivo') return 'Inactivo';
    return status || 'Sin estado';
  }

  statusClass(status?: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active' || normalized === 'activo') return 'truck-status truck-status--active';
    if (normalized === 'maintenance' || normalized === 'mantenimiento') return 'truck-status truck-status--maintenance';
    return 'truck-status truck-status--inactive';
  }

  isMaintenance(status?: string): boolean {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'maintenance' || normalized === 'mantenimiento';
  }
}