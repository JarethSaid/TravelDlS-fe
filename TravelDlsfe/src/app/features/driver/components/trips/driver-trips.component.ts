import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-driver-trips',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trips-page">
      <div class="page-header">
        <h1>Mis Viajes</h1>
        <p class="subtitle">Gestiona y consulta tus viajes asignados</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'all'"
            (click)="activeFilter = 'all'"
          >Todos</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'pending'"
            (click)="activeFilter = 'pending'"
          >Pendientes</button>
          <button
            class="tab"
            [class.tab--active]="activeFilter === 'completed'"
            (click)="activeFilter = 'completed'"
          >Completados</button>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-card">
        <div class="empty-icon">
          <i class="fa-solid fa-route"></i>
        </div>
        <h3>No hay viajes registrados</h3>
        <p>Cuando te asignen viajes, aparecerán aquí para que puedas darles seguimiento.</p>
      </div>
    </div>
  `,
  styles: [`
    .trips-page {
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
  `]
})
export class DriverTripsComponent {
  private readonly auth = inject(AuthService);
  activeFilter = 'all';
}
