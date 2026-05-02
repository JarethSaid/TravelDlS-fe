import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>Bienvenido, {{ user()?.name || 'Empresa' }}</h1>
        <p>Resumen de tu operación</p>
      </header>

      <!-- Resumen (KPIs) -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CONDUCTORES</span>
            <span class="kpi-value">0</span>
          </div>
          <div class="kpi-icon kpi-icon--blue">
            <i class="fa-solid fa-user-group"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CAMIONES</span>
            <span class="kpi-value">0</span>
          </div>
          <div class="kpi-icon kpi-icon--yellow">
            <i class="fa-solid fa-truck"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">PEDIDOS</span>
            <span class="kpi-value">0</span>
          </div>
          <div class="kpi-icon kpi-icon--green">
            <i class="fa-solid fa-box"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CHOFERES DISP.</span>
            <span class="kpi-value">0</span>
          </div>
          <div class="kpi-icon kpi-icon--cyan">
            <i class="fa-solid fa-user-check"></i>
          </div>
        </div>
      </div>

      <!-- Main Panels -->
      <div class="panels-grid">
        <!-- Conductores por Estado -->
        <div class="panel-card">
          <div class="panel-header">
            <i class="fa-solid fa-user-group"></i>
            <h2>Conductores por Estado</h2>
          </div>
          <div class="panel-content panel-content--stats">
            <div class="stat-item">
              <span class="stat-label">Disponible</span>
              <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">En viaje</span>
              <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Desconectado</span>
              <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Inactivo</span>
              <span class="stat-value">0</span>
            </div>
          </div>
        </div>

        <!-- Distribución de Pedidos -->
        <div class="panel-card">
          <div class="panel-header">
            <i class="fa-solid fa-box"></i>
            <h2>Distribución de Pedidos</h2>
          </div>
          <div class="panel-content panel-content--empty">
            <div class="empty-state">
              <i class="fa-solid fa-box-open"></i>
              <p>Sin datos aún</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .dashboard-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .dashboard-header p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 20px;
    }

    .kpi-icon--blue {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .kpi-icon--yellow {
      background: #fef3c7;
      color: #d97706;
    }

    .kpi-icon--green {
      background: #dcfce7;
      color: #16a34a;
    }

    .kpi-icon--cyan {
      background: #cffafe;
      color: #0891b2;
    }

    /* Panels Grid */
    .panels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 16px;
    }

    .panel-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      min-height: 300px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .panel-header i {
      color: #3b28cc;
      font-size: 16px;
    }

    .panel-header h2 {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .panel-content {
      flex: 1;
    }

    /* Stats Content */
    .panel-content--stats {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      padding-bottom: 20px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Empty Content */
    .panel-content--empty {
      display: grid;
      place-items: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #cbd5e1;
    }

    .empty-state i {
      font-size: 48px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
    }
  `,
})
export class CompanyDashboardComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
}
