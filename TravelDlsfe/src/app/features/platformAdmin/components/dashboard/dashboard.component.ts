import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <!-- Stats grid -->
      <div class="stats-grid">
        @for (s of stats(); track s.label) {
          <div class="stat-card">
            <div class="stat-info">
              <p class="stat-label">{{ s.label }}</p>
              <p class="stat-value">{{ s.value }}</p>
            </div>
            <div class="stat-icon" [style.background]="s.bg" [style.color]="s.color">
              <i [class]="s.icon"></i>
            </div>
          </div>
        }
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <!-- Bar chart: Conductores por estado -->
        <div class="chart-card">
          <div class="chart-header">
            <i class="fa-solid fa-chart-bar"></i>
            <span>Conductores por Estado</span>
          </div>
          <div class="bar-chart">
            @for (bar of driverBars(); track bar.label) {
              <div class="bar-col">
                <div class="bar-wrap">
                  <div
                    class="bar"
                    [style.height.%]="bar.pct"
                    [style.background]="'#3d39af'"
                  ></div>
                </div>
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-val">{{ bar.value }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Donut chart: Tipos de Clientes -->
        <div class="chart-card">
          <div class="chart-header">
            <i class="fa-solid fa-users-rays"></i>
            <span>Distribución de Clientes</span>
          </div>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 120 120">
              @for (seg of donutSegments(); track seg.label; let i = $index) {
                <circle
                  class="donut-ring"
                  cx="60" cy="60" r="44"
                  [attr.stroke]="seg.color"
                  [attr.stroke-dasharray]="seg.dash + ' ' + seg.gap"
                  [attr.stroke-dashoffset]="seg.offset"
                />
              }
              <circle cx="60" cy="60" r="30" fill="white"/>
            </svg>
            <div class="donut-legend">
              @for (seg of donutSegments(); track seg.label) {
                <div class="legend-row">
                  <span class="legend-dot" [style.background]="seg.color"></span>
                  <span>{{ seg.label }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ---- STATS ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border: 1px solid #f1f5f9;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }

    .stat-label {
      margin: 0 0 4px;
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .stat-value {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      color: #1e293b;
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 18px;
    }

    /* ---- CHARTS ---- */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 768px) {
      .charts-row { grid-template-columns: 1fr; }
    }

    .chart-card {
      background: white;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border: 1px solid #f1f5f9;
    }

    .chart-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .chart-header i { color: #3d39af; }

    /* Bar chart */
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      height: 160px;
      padding-bottom: 30px;
      position: relative;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      height: 100%;
    }

    .bar-wrap {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
    }

    .bar {
      width: 100%;
      border-radius: 6px 6px 0 0;
      min-height: 4px;
      transition: height 0.4s ease;
    }

    .bar-label {
      font-size: 11px;
      color: #64748b;
      text-align: center;
      white-space: nowrap;
    }

    .bar-val {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
    }

    /* Donut */
    .donut-wrap {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .donut {
      width: 160px;
      height: 160px;
      transform: rotate(-90deg);
      flex-shrink: 0;
    }

    .donut-ring {
      fill: none;
      stroke-width: 16;
    }

    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly stats = signal<StatCard[]>([
    { label: 'Empresas',    value: 0, icon: 'fa-solid fa-building', color: '#6366f1', bg: '#ede9fe' },
    { label: 'Conductores', value: 0, icon: 'fa-solid fa-id-card',  color: '#0ea5e9', bg: '#e0f2fe' },
    { label: 'Clientes',    value: 0, icon: 'fa-solid fa-users',    color: '#10b981', bg: '#d1fae5' },
    { label: 'Disponibles', value: 0, icon: 'fa-solid fa-user-check', color: '#14b8a6', bg: '#ccfbf1' },
  ]);

  readonly driverBars = signal<{ label: string; value: number; pct: number }[]>([]);
  readonly donutSegments = signal<
    { label: string; color: string; dash: number; gap: number; offset: number }[]
  >([]);

  ngOnInit(): void {
    const circumference = 2 * Math.PI * 44; // ≈ 276.5

    this.dashboardService.getDashboardStats().subscribe((res) => {
      
      const drivers: any[] = res.drivers?.data ?? [];
      const clients: any[] = res.clients?.data ?? [];

      const driversAvailable = drivers.filter(d => d.status === 'available').length;

      const updated = [...this.stats()];
      updated[0].value = res.companies?.meta?.total ?? 0;
      updated[1].value = res.drivers?.meta?.total ?? drivers.length;
      updated[2].value = res.clients?.meta?.total ?? clients.length;
      updated[3].value = driversAvailable;
      this.stats.set(updated);

      // Driver bars
      const statuses = ['Disponible', 'En viaje', 'Desconectado', 'Inactivo'];
      const statusMap: Record<string, number> = { Disponible: 0, 'En viaje': 0, Desconectado: 0, Inactivo: 0 };
      
      // Map API statuses to UI labels
      const statusTranslator: Record<string, string> = {
        'available': 'Disponible',
        'on_trip': 'En viaje',
        'offline': 'Desconectado',
        'inactive': 'Inactivo'
      };

      drivers.forEach((d) => {
        const rawStatus = d.status ?? 'offline';
        const uiStatus = statusTranslator[rawStatus] ?? 'Desconectado';
        if (statusMap[uiStatus] !== undefined) statusMap[uiStatus]++;
      });
      const maxVal = Math.max(...Object.values(statusMap), 1);
      this.driverBars.set(
        statuses.map((s) => ({
          label: s,
          value: statusMap[s],
          pct: (statusMap[s] / maxVal) * 100,
        }))
      );

      // Donut segments (Clients by type: B2B vs B2C)
      const clientTypes = [
        { key: 'empresa', label: 'B2B (Empresas)', color: '#3d39af' },
        { key: 'persona', label: 'B2C (Personas)', color: '#10b981' },
      ];
      
      const clientMap: Record<string, number> = { 'empresa': 0, 'persona': 0 };
      clients.forEach((c) => {
        const type = c.typeClient?.toLowerCase() === 'empresa' ? 'empresa' : 'persona';
        clientMap[type]++;
      });
      
      const totalClients = clients.length || 1;
      let currentOffset = 0;
      const segs = clientTypes.map((s) => {
        const count = clientMap[s.key] ?? 0;
        const dash = (count / totalClients) * circumference;
        const gap = circumference - dash;
        const seg = { label: s.label, color: s.color, dash, gap, offset: -currentOffset };
        currentOffset += dash;
        return seg;
      });
      this.donutSegments.set(segs);
    });
  }
}
