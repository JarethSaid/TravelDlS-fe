import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { CompanyService } from '../../../platformAdmin/services/company.service';
import { Company } from '../../../platformAdmin/interface/company.interface';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-company-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.sidebar-collapsed]="isSidebarCollapsed()">
      @if (isMobileMenuOpen()) {
        <div class="sidebar-overlay" (click)="isMobileMenuOpen.set(false)"></div>
      }
      <!-- ===== SIDEBAR ===== -->
      <aside class="sidebar" [class.mobile-open]="isMobileMenuOpen()">
        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="brand-logo">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
          <span class="brand-name">TravelDLS</span>
          <button class="btn-collapse hidden-mobile" (click)="toggleSidebar()">
            <i class="fa-solid" [class.fa-angle-left]="!isSidebarCollapsed()" [class.fa-angle-right]="isSidebarCollapsed()"></i>
          </button>
        </div>

        <!-- Company Info Box -->
        <div class="company-box">
          <div class="company-icon" *ngIf="!company()?.photoUrl">
            <i class="fa-solid fa-building"></i>
          </div>
          <img
            *ngIf="company()?.photoUrl"
            [src]="company()?.photoUrl"
            class="company-photo-small"
            alt="Logo de empresa"
          />
          <div class="company-details">
            <span class="company-name">{{
              company()?.businessName || user()?.name || 'Empresa'
            }}</span>
            <span class="company-ruc">RUC: {{ company()?.ruc || 'Pendiente' }}</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a class="nav-item" [routerLink]="item.route" routerLinkActive="nav-item--active" (click)="isMobileMenuOpen.set(false)" [title]="isSidebarCollapsed() ? item.label : ''">
              <i [class]="item.icon"></i>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- User Info & Logout -->
        <div class="sidebar-bottom">
          @if (user()) {
            <div class="user-info">
              <div class="user-avatar">
                {{ user()!.name.charAt(0).toUpperCase() }}
              </div>
              <div class="user-details">
                <span class="user-name">{{ user()!.name }}</span>
                <span class="user-email">{{ user()!.email }}</span>
              </div>
            </div>
          }
          <button class="btn-logout" (click)="logout()" [disabled]="loggingOut()">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>{{ loggingOut() ? 'Saliendo…' : 'Cerrar sesión' }}</span>
          </button>
        </div>
      </aside>

      <!-- ===== MAIN CONTENT ===== -->
      <div class="main-content">
        <!-- Top Bar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="menu-btn hidden-desktop" (click)="isMobileMenuOpen.set(true)">
              <i class="fa-solid fa-bars"></i>
            </button>
          </div>
          <div class="topbar-actions">
            <button class="notif-btn" type="button">
              <i class="fa-regular fa-bell"></i>
            </button>
          </div>
        </header>

        <!-- Router Outlet -->
        <main class="page-content">
          <router-outlet></router-outlet>
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
      background: #f4f5f7;
    }

    /* ======= SIDEBAR ======= */
    .sidebar {
      width: 250px;
      min-width: 250px;
      background: #1b193b; /* Dark purple from the design */
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
      gap: 12px;
      padding: 0 20px 24px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #4f46e5;
      display: grid;
      place-items: center;
      color: white;
      font-size: 16px;
      flex-shrink: 0;
    }

    .brand-name {
      color: white;
      font-weight: 700;
      font-size: 18px;
      white-space: nowrap;
    }

    /* Company Box */
    .company-box {
      margin: 0 16px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .company-icon {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: #a5b4fc;
      font-size: 14px;
      flex-shrink: 0;
    }

    .company-photo-small {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .company-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .company-name {
      color: white;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .company-ruc {
      color: #94a3b8;
      font-size: 11px;
    }

    /* Nav */
    .sidebar-nav {
      flex: 1;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .sidebar-nav::-webkit-scrollbar {
      display: none;
    }
    .sidebar-nav {
      scrollbar-width: none;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .nav-item i {
      width: 20px;
      text-align: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: white;
    }

    .nav-item--active {
      background: #4f46e5 !important; /* Indigo for active state */
      color: white !important;
    }

    /* Bottom: User Info & Logout */
    .sidebar-bottom {
      padding: 16px;
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #312e81;
      color: white;
      display: grid;
      place-items: center;
      font-weight: 600;
      font-size: 16px;
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
      padding: 10px;
      color: #f87171;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-align: left;
    }

    .btn-logout:hover {
      color: #ef4444;
    }

    .btn-logout:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ======= MAIN CONTENT ======= */
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
    }

    .notif-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: #f1f5f9;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 16px;
      color: #64748b;
      transition: 0.2s;
    }

    .notif-btn:hover {
      background: #e2e8f0;
      color: #334155;
    }

    /* Page content */
    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
  `,
})
export class CompanyShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(InteractionService);
  private readonly companyService = inject(CompanyService);

  readonly loggingOut = signal(false);
  readonly user = this.auth.user;
  company = signal<Company | null>(null);
  readonly isSidebarCollapsed = signal(false);
  readonly isMobileMenuOpen = signal(false);

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser?.idCompany) {
        this.companyService.getById(currentUser.idCompany).subscribe({
          next: (c: any) => {
            const companyData = c.data || c.company || c;
            this.company.set({
              ...companyData,
              businessName:
                companyData.businessName || companyData.business_name || currentUser.name,
              ruc: companyData.ruc || companyData.ruc,
              photoUrl: companyData.photoUrl || companyData.photo_url,
            });
          },
          error: (err) => console.error('Error fetching company details (Shell):', err),
        });
      }
    });
  }

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'fa-solid fa-border-all', route: '/company/dashboard' },
    { label: 'Mis Conductores', icon: 'fa-solid fa-user-group', route: '/company/drivers' },
    { label: 'Mis Camiones', icon: 'fa-solid fa-truck', route: '/company/trucks' },
    { label: 'Mis Pedidos', icon: 'fa-solid fa-box', route: '/company/orders' },
    { label: 'Mi Empresa', icon: 'fa-regular fa-building', route: '/company/profile' },
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
