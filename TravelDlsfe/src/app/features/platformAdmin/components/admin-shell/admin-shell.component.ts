import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">

      <!-- ===== SIDEBAR FIJO ===== -->
      <aside class="sidebar">

        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="brand-logo">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
          <span class="brand-name">TransLogix</span>
        </div>

        <!-- Role badge -->
        <div class="role-badge">
          <i class="fa-solid fa-shield-halved"></i>
          Platform Admin
        </div>

        <!-- Nav -->
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="nav-item--active"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Bottom: info usuario + cerrar sesión -->
        <div class="sidebar-bottom">
          <!-- Info usuario -->
          @if (user()) {
            <div class="user-info">
              <div class="user-avatar">
                <i class="fa-solid fa-circle-user"></i>
              </div>
              <div class="user-details">
                <span class="user-name">{{ user()!.name }}</span>
                <span class="user-email">{{ user()!.email }}</span>
              </div>
            </div>
          }

          <!-- Cerrar sesión -->
          <button class="btn-logout" (click)="logout()" [disabled]="loggingOut()">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>{{ loggingOut() ? 'Saliendo…' : 'Cerrar sesión' }}</span>
          </button>
        </div>
      </aside>

      <!-- ===== MAIN CONTENT ===== -->
      <div class="main-content">
        <!-- Top bar -->
        <header class="topbar">
          <div class="topbar-search">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" class="search-input" placeholder="Buscar..." />
          </div>
          <div class="topbar-actions">
            <button class="notif-btn" type="button">
              <i class="fa-regular fa-bell"></i>
              <span class="notif-dot"></span>
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="page-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
    }

    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #f1f5f9;
    }

    /* ======= SIDEBAR FIJO ======= */
    .sidebar {
      width: 230px;
      min-width: 230px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      padding: 20px 0 0;
      overflow: hidden;
      flex-shrink: 0;
    }

    /* Brand */
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3d39af, #5c58d6);
      display: grid;
      place-items: center;
      color: white;
      font-size: 16px;
      flex-shrink: 0;
    }

    .brand-name {
      color: white;
      font-weight: 800;
      font-size: 16px;
      white-space: nowrap;
    }

    /* Role badge */
    .role-badge {
      margin: 12px 12px 4px;
      background: rgba(61,57,175,0.3);
      border: 1px solid rgba(92,88,214,0.4);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    /* Nav */
    .sidebar-nav {
      flex: 1;
      padding: 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    /* Ocultar scrollbar del nav */
    .sidebar-nav::-webkit-scrollbar { display: none; }
    .sidebar-nav { scrollbar-width: none; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .nav-item i {
      width: 18px;
      text-align: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    .nav-item:hover {
      background: rgba(255,255,255,0.06);
      color: white;
    }

    .nav-item--active {
      background: #3d39af !important;
      color: white !important;
    }

    /* ======= BOTTOM: usuario + logout ======= */
    .sidebar-bottom {
      padding: 12px 10px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
    }

    .user-avatar {
      font-size: 28px;
      color: #a5b4fc;
      line-height: 1;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      color: white;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      color: #64748b;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #f87171;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      width: 100%;
      text-align: left;
      white-space: nowrap;
    }

    .btn-logout i {
      width: 18px;
      text-align: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    .btn-logout:hover {
      background: rgba(248,113,113,0.1);
      color: #fca5a5;
    }

    .btn-logout:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ======= MAIN ======= */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Topbar */
    .topbar {
      height: 64px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      flex-shrink: 0;
    }

    .topbar-search {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 13px;
    }

    .search-input {
      padding: 8px 14px 8px 36px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      width: 220px;
      transition: 0.2s;
      font-family: inherit;
      background: #f8fafc;
    }

    .search-input:focus {
      border-color: #3d39af;
      background: white;
      box-shadow: 0 0 0 3px rgba(61,57,175,0.08);
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notif-btn {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: white;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 16px;
      color: #64748b;
      transition: 0.2s;
    }

    .notif-btn:hover {
      border-color: #3d39af;
      color: #3d39af;
    }

    .notif-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      background: #f87171;
      border-radius: 50%;
      border: 2px solid white;
    }

    /* Page content */
    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 28px;
    }
  `,
})
export class AdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(InteractionService);

  readonly loggingOut = signal(false);
  readonly user = this.auth.user;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',   icon: 'fa-solid fa-chart-pie', route: '/admin/dashboard' },
    { label: 'Empresas',    icon: 'fa-solid fa-building',  route: '/admin/companies' },
    { label: 'Conductores', icon: 'fa-solid fa-id-card',   route: '/admin/drivers'   },
    { label: 'Camiones',    icon: 'fa-solid fa-truck',     route: '/admin/trucks'    },
    { label: 'Clientes',    icon: 'fa-solid fa-users',     route: '/admin/clients'   },
  ];

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.ui.showLoading();
    this.auth.logout().subscribe({
      next: () => {
        this.ui.hideLoading();
        this.loggingOut.set(false);
        this.ui.showToast('Sesión cerrada', 'success');
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        this.ui.hideLoading();
        this.loggingOut.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        void this.router.navigate(['/login']);
      },
    });
  }
}
