import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InteractionService } from '../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../core/http/http-error.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dash-wrap">
      <header class="dash-header">
        <div class="dash-brand">
          <i class="fa-solid fa-truck-fast" aria-hidden="true"></i>
          <span>TravelDLS</span>
        </div>
        <button type="button" class="btn-outline" (click)="logout()" [disabled]="loggingOut">
          {{ loggingOut ? 'Saliendo…' : 'Cerrar sesión' }}
        </button>
      </header>

      <main class="dash-main">
        <section class="welcome card">
          <h1>Hola, {{ user()?.name ?? 'usuario' }}</h1>
          <p class="meta">
            Rol: <strong>{{ user()?.role ?? '—' }}</strong>
            @if (user()?.email) {
              <span class="dot">·</span>
              {{ user()?.email }}
            }
          </p>
          <p class="hint">
            Pantalla principal tras iniciar sesión. Desde aquí podrás enlazar la gestión de tus
            envíos de carga pesada: cotizaciones, órdenes de carga, seguimiento y documentación.
          </p>
        </section>
      </main>
    </div>
  `,
  styles: `
    .dash-wrap {
      min-height: 100vh;
      background: var(--gris, #f8f9fa);
    }
    .dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }
    .dash-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 1.1rem;
      color: var(--primario, #3d39af);
    }
    .dash-brand i {
      font-size: 1.25rem;
    }
    .btn-outline {
      border: 1px solid var(--primario, #3d39af);
      background: white;
      color: var(--primario, #3d39af);
      padding: 10px 18px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
    }
    .btn-outline:hover:not(:disabled) {
      background: var(--primario, #3d39af);
      color: white;
    }
    .btn-outline:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .dash-main {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .welcome h1 {
      margin: 0 0 8px;
      font-size: clamp(1.35rem, 4vw, 1.75rem);
      color: var(--texto, #2d3436);
    }
    .meta {
      margin: 0 0 16px;
      color: #64748b;
      font-size: 14px;
    }
    .dot {
      margin: 0 6px;
    }
    .hint {
      margin: 0;
      line-height: 1.55;
      color: #475569;
      font-size: 15px;
    }
  `,
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(InteractionService);

  readonly user = this.auth.user;
  loggingOut = false;

  logout(): void {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.ui.showLoading();
    this.auth.logout().subscribe({
      next: () => {
        this.ui.hideLoading();
        this.loggingOut = false;
        this.ui.showToast('Sesión cerrada', 'success');
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        this.ui.hideLoading();
        this.loggingOut = false;
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        void this.router.navigate(['/login']);
      },
    });
  }
}
