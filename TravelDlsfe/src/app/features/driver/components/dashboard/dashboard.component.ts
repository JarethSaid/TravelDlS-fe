import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="dashboard">
      <div class="header-section">
        <h1>Bienvenido, {{ firstName() }} 👋</h1>
        <p class="date">{{ currentDate }}</p>
      </div>

      <!-- Stats grid -->
      <div class="stats-grid">
        @for (s of stats(); track s.label) {
          <div class="stat-card">
            <div class="stat-icon" [style.background]="s.bg" [style.color]="s.color">
              <i [class]="s.icon"></i>
            </div>
            <div class="stat-info">
              <p class="stat-value">{{ s.value }}</p>
              <p class="stat-label">{{ s.label }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Recent Trips -->
      <div class="recent-trips">
        <div class="section-header">
          <h2>Viajes recientes</h2>
          <a href="#" class="view-all">Ver todos ></a>
        </div>
        <div class="empty-state">
          No hay viajes registrados.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .header-section h1 {
      margin: 0;
      font-size: 24px;
      color: #1e293b;
      font-weight: 700;
    }

    .header-section .date {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }

    .stat-label {
      margin: 2px 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .recent-trips {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      border: 1px solid #f1f5f9;
      min-height: 250px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }

    .view-all {
      color: #3d39af;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 14px;
      height: 100px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .stat-card {
        padding: 16px;
        gap: 12px;
      }
      .stat-icon {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }
      .stat-value {
        font-size: 20px;
      }
      .recent-trips {
        padding: 18px;
      }
      .header-section h1 {
        font-size: 20px;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DriverDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly datePipe = inject(DatePipe);

  readonly user = this.auth.user;
  readonly firstName = signal<string>('Usuario');
  
  // IMPORTANTE: Se ha omitido la tarjeta de 'En curso' de las estadísticas.
  readonly stats = signal<StatCard[]>([
    { label: 'Total viajes', value: 0, icon: 'fa-solid fa-truck-moving', color: '#6366f1', bg: '#ede9fe' },
    { label: 'Completados', value: 0, icon: 'fa-regular fa-circle-check', color: '#10b981', bg: '#d1fae5' },
    { label: 'Pendientes', value: 0, icon: 'fa-regular fa-clock', color: '#f59e0b', bg: '#fef3c7' },
  ]);

  currentDate = '';

  ngOnInit(): void {
    const today = new Date();
    // Utilizando locale dinámico si es necesario, o en su defecto un fallback.
    this.currentDate = this.datePipe.transform(today, 'EEEE, d \'de\' MMMM yyyy', '', 'en-US') || '';
    
    if (this.user() && this.user()?.name) {
      const nameParts = this.user()!.name.split(' ');
      this.firstName.set(nameParts[0]);
    }
  }
}
