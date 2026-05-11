import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../platformAdmin/services/company.service';
import { CompanyDriverService } from '../../services/driver.service';
import { TruckService } from '../../../platformAdmin/services/truck.service';
import { OrderService } from '../../services/order.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>Bienvenido, {{ businessName() }}</h1>
        <p>Resumen de tu operación logística en tiempo real</p>
      </header>

      <!-- Resumen (KPIs) -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CONDUCTORES</span>
            <span class="kpi-value" *ngIf="!loading()">{{ stats().drivers }}</span>
            <div class="skeleton-value" *ngIf="loading()"></div>
          </div>
          <div class="kpi-icon kpi-icon--primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CAMIONES</span>
            <span class="kpi-value" *ngIf="!loading()">{{ stats().trucks }}</span>
            <div class="skeleton-value" *ngIf="loading()"></div>
          </div>
          <div class="kpi-icon kpi-icon--secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5.05a1 1 0 0 0-.29-.707l-4.01-4.01A1 1 0 0 0 17.05 7h-2.05"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">PEDIDOS</span>
            <span class="kpi-value" *ngIf="!loading()">{{ stats().orders }}</span>
            <div class="skeleton-value" *ngIf="loading()"></div>
          </div>
          <div class="kpi-icon kpi-icon--green">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <span class="kpi-label">CHOFERES DISP.</span>
            <span class="kpi-value" *ngIf="!loading()">{{ stats().availableDrivers }}</span>
            <div class="skeleton-value" *ngIf="loading()"></div>
          </div>
          <div class="kpi-icon kpi-icon--cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          </div>
        </div>
      </div>

      <!-- Main Panels -->
      <div class="panels-grid">
        <!-- Conductores por Estado -->
        <div class="panel-card">
          <div class="panel-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h2>Conductores por Estado</h2>
          </div>
          
          <div class="panel-content" [class.loading-content]="loading()">
            @if (loading()) {
              <div class="chart-skeleton"></div>
            } @else {
              <div class="bar-chart-container">
                <div class="bar-item" *ngFor="let item of driverStatusData()">
                  <div class="bar-wrapper">
                    <div class="bar-fill" [style.height.%]="item.percentage" [style.background-color]="item.color">
                      <span class="bar-count">{{ item.count }}</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ item.label }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Distribución de Pedidos -->
        <div class="panel-card">
          <div class="panel-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>
            <h2>Próximos Viajes</h2>
          </div>
          <div class="panel-content panel-content--empty">
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <p>No hay viajes programados próximamente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header h1 {
      font-size: 28px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }

    .dashboard-header p {
      font-size: 16px;
      color: #64748b;
      margin: 0;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #f1f5f9;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
    }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }

    .skeleton-value {
      width: 60px;
      height: 32px;
      background: #f1f5f9;
      border-radius: 6px;
      animation: pulse 1.5s infinite;
    }

    .kpi-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: grid;
      place-items: center;
    }

    .kpi-icon--primary {
      background: rgba(85, 66, 208, 0.1);
      color: #5542D0;
    }

    .kpi-icon--secondary {
      background: rgba(160, 132, 220, 0.1);
      color: #A084DC;
    }

    .kpi-icon--green {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .kpi-icon--cyan {
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
    }

    /* Panels Grid */
    .panels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
    }

    .panel-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      min-height: 380px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      border: 1px solid #f1f5f9;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 40px;
    }

    .panel-header svg {
      color: #5542D0;
    }

    .panel-header h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .panel-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Bar Chart */
    .bar-chart-container {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 200px;
      padding-top: 20px;
      gap: 20px;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 80px;
    }

    .bar-wrapper {
      width: 100%;
      height: 160px;
      background: #f8fafc;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .bar-fill {
      width: 100%;
      border-radius: 12px 12px 0 0;
      transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 8px;
    }

    .bar-count {
      font-size: 11px;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .bar-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-align: center;
    }

    /* Skeletons */
    .chart-skeleton {
      flex: 1;
      background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
      border-radius: 12px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    /* Empty State */
    .panel-content--empty {
      justify-content: center;
      align-items: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #cbd5e1;
    }

    .empty-state p {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: #94a3b8;
    }
  `,
})
export class CompanyDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly driverService = inject(CompanyDriverService);
  private readonly truckService = inject(TruckService);
  private readonly orderService = inject(OrderService);

  readonly user = this.auth.user;
  
  loading = signal(true);
  businessName = signal('Empresa');
  
  stats = signal({
    drivers: 0,
    trucks: 0,
    orders: 0,
    availableDrivers: 0
  });

  driverCounts = signal({
    available: 0,
    ontrip: 0,
    offline: 0,
    inactive: 0
  });

  driverStatusData = computed(() => {
    const counts = this.driverCounts();
    const total = counts.available + counts.ontrip + counts.offline + counts.inactive || 1;
    
    return [
      { label: 'Disponible', count: counts.available, percentage: (counts.available / total) * 100, color: '#22c55e' },
      { label: 'En viaje', count: counts.ontrip, percentage: (counts.ontrip / total) * 100, color: '#5542D0' },
      { label: 'Desconectado', count: counts.offline, percentage: (counts.offline / total) * 100, color: '#A084DC' },
      { label: 'Inactivo', count: counts.inactive, percentage: (counts.inactive / total) * 100, color: '#94a3b8' }
    ];
  });

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    const companyId = this.user()?.idCompany;
    if (!companyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    // Fetch basic company info for the name
    this.companyService.getById(companyId).subscribe({
      next: (c: any) => {
        const companyData = c.data || c.company || c;
        this.businessName.set(companyData.businessName || companyData.business_name || this.user()?.name || 'Empresa');
      }
    });

    // Fetch stats in parallel
    const driverParams = new HttpParams().set('idCompany', companyId).set('perPage', 1000);
    const truckParams = { idCompany: companyId, perPage: 1 };
    const orderParams = new HttpParams().set('idCompany', companyId).set('perPage', 1);

    forkJoin({
      drivers: this.driverService.getDrivers(driverParams),
      trucks: this.truckService.list(truckParams),
      orders: this.orderService.getOrders(orderParams)
    }).subscribe({
      next: (res: any) => {
        const driversList = res.drivers.data || [];
        
        // Process driver statuses
        const counts = {
          available: 0,
          ontrip: 0,
          offline: 0,
          inactive: 0
        };

        driversList.forEach((d: any) => {
          if (d.status === 'available') counts.available++;
          else if (d.status === 'ontrip') counts.ontrip++;
          else if (d.status === 'offline') counts.offline++;
          else if (d.status === 'inactive') counts.inactive++;
        });

        this.driverCounts.set(counts);
        
        this.stats.set({
          drivers: res.drivers.meta?.total || driversList.length,
          trucks: res.trucks.meta?.total || 0,
          orders: res.orders.meta?.total || 0,
          availableDrivers: counts.available
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading.set(false);
      }
    });
  }
}

