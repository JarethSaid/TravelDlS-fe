import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { API_BASE_URL } from '../../../../core/api-base-url';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface DriverProfile {
  idDriver: number;
  license: string;
  passport: string;
  photoUrl: string | null;
  status: string;
  idCompany: number;
  company?: { idCompany: number; businessName: string };
  user?: { name: string; email: string; phone?: string };
}

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">

      <!-- Header card -->
      <div class="header-card">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar">
              <i class="fa-solid fa-user-large"></i>
            </div>
            <button class="camera-btn" type="button">
              <i class="fa-solid fa-camera"></i>
            </button>
          </div>
          <div class="header-info">
            <h1>{{ profile()?.user?.name ?? user()?.name ?? 'Conductor' }}</h1>
            <p class="header-email">{{ profile()?.user?.email ?? user()?.email ?? '' }}</p>
            <span class="status-badge" [class]="'status-badge status-' + (profile()?.status ?? 'available')">
              {{ statusLabel(profile()?.status ?? 'available') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Info card -->
      <div class="info-card">
        <h2 class="section-title">Información personal</h2>
        <hr class="divider" />

        @if (loading()) {
          <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i> Cargando información…
          </div>
        } @else {
          <div class="form-grid">
            <!-- Nombre completo (full width) -->
            <div class="field full-width">
              <label>Nombre completo</label>
              <input type="text" [value]="profile()?.user?.name ?? user()?.name ?? ''" readonly />
            </div>

            <!-- Licencia | Pasaporte -->
            <div class="field">
              <label><i class="fa-regular fa-id-card"></i> Licencia</label>
              <input type="text" [(ngModel)]="license" />
            </div>
            <div class="field">
              <label><i class="fa-regular fa-address-card"></i> Pasaporte</label>
              <input type="text" [(ngModel)]="passport" />
            </div>

            <!-- Teléfono | Correo -->
            <div class="field">
              <label><i class="fa-solid fa-phone"></i> Teléfono</label>
              <input type="text" [(ngModel)]="phone" />
            </div>
            <div class="field">
              <label><i class="fa-regular fa-envelope"></i> Correo</label>
              <input type="email" [value]="profile()?.user?.email ?? user()?.email ?? ''" readonly />
            </div>

            <!-- Compañía | Estado -->
            <div class="field">
              <label><i class="fa-regular fa-building"></i> Compañía</label>
              <input type="text" [value]="profile()?.company?.businessName ?? 'Sin asignar'" readonly />
            </div>
            <div class="field">
              <label>Estado</label>
              <select [(ngModel)]="status">
                <option value="available">Activo</option>
                <option value="on_trip">En viaje</option>
                <option value="offline">Desconectado</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-save" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 820px;
    }

    /* ===== HEADER CARD ===== */
    .header-card {
      background: white;
      border-radius: 16px;
      padding: 28px 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      border: 1px solid #f1f5f9;
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 16px;
      background: #f1f5f9;
      display: grid;
      place-items: center;
      font-size: 36px;
      color: #94a3b8;
      border: 2px solid #e2e8f0;
    }

    .camera-btn {
      position: absolute;
      bottom: -6px;
      right: -6px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #3d39af;
      color: white;
      border: 3px solid white;
      display: grid;
      place-items: center;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .camera-btn:hover {
      background: #2d2a8a;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-info h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .header-email {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 12px;
      border-radius: 20px;
      width: fit-content;
      margin-top: 4px;
    }

    .status-available { background: #dcfce7; color: #16a34a; }
    .status-on_trip   { background: #dbeafe; color: #1d4ed8; }
    .status-offline   { background: #f1f5f9; color: #64748b; }
    .status-inactive  { background: #fee2e2; color: #dc2626; }

    /* ===== INFO CARD ===== */
    .info-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      border: 1px solid #f1f5f9;
    }

    .section-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #3d39af;
    }

    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 16px 0 24px;
    }

    .loading-state {
      text-align: center;
      color: #64748b;
      padding: 40px 0;
      font-size: 14px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field.full-width {
      grid-column: 1 / -1;
    }

    .field label {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .field label i {
      font-size: 14px;
      color: #64748b;
    }

    .field input,
    .field select {
      padding: 11px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      color: #1e293b;
      background: white;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }

    .field input:focus,
    .field select:focus {
      border-color: #3d39af;
      box-shadow: 0 0 0 3px rgba(61,57,175,0.08);
    }

    .field input[readonly] {
      background: #f8fafc;
      color: #475569;
      cursor: default;
    }

    .field select {
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 18px;
      padding-right: 36px;
    }

    /* ===== ACTIONS ===== */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 28px;
    }

    .btn-save {
      padding: 11px 32px;
      background: #3d39af;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      font-family: inherit;
    }

    .btn-save:hover {
      background: #2d2a8a;
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .avatar-section {
        flex-direction: column;
        text-align: center;
      }

      .header-info {
        align-items: center;
      }
    }
  `]
})
export class DriverProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly ui = inject(InteractionService);

  readonly user = this.auth.user;
  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  // Campos editables
  license = '';
  passport = '';
  phone = '';
  status = 'available';

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    const u = this.user();
    if (!u?.idDriver) {
      this.loading.set(false);
      return;
    }

    this.http.get<DriverProfile>(`${this.base}/api/drivers/${u.idDriver}`).subscribe({
      next: (driver) => {
        this.profile.set(driver);
        this.license = driver.license ?? '';
        this.passport = driver.passport ?? '';
        this.phone = (driver.user as any)?.phone ?? '';
        this.status = driver.status ?? 'available';
        this.loading.set(false);
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    const u = this.user();
    if (!u?.idDriver || this.saving()) return;
    this.saving.set(true);
    this.ui.showLoading();

    const body = {
      license: this.license,
      passport: this.passport,
      status: this.status,
    };

    this.http.put(`${this.base}/api/drivers/${u.idDriver}`, body).subscribe({
      next: () => {
        this.ui.hideLoading();
        this.saving.set(false);
        this.ui.showToast('Perfil actualizado', 'success');
        this.loadProfile();
      },
      error: (err) => {
        this.ui.hideLoading();
        this.saving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Activo',
      on_trip:   'En viaje',
      offline:   'Desconectado',
      inactive:  'Inactivo',
    };
    return map[status] ?? status;
  }
}
