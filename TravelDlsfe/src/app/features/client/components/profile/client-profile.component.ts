import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { ClientProfile } from '../../interface/client.interface';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <!-- Header card -->
      <div class="header-card">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar">
              @if (photoPreviewUrl()) {
                <img [src]="photoPreviewUrl()!" alt="Preview" class="avatar-img" />
              } @else if (profile()?.photoUrl) {
                <img [src]="profile()?.photoUrl" alt="Foto actual" class="avatar-img" />
              } @else {
                <i class="fa-solid fa-building"></i>
              }
            </div>
            <label class="camera-btn" for="photoUpload" title="Cambiar foto">
              <i class="fa-solid fa-camera"></i>
            </label>
            <input 
              id="photoUpload" 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              style="display:none" 
              (change)="onFileSelected($event)" 
            />
          </div>
          <div class="header-info">
            <h1>{{ profile()?.companyName ?? user()?.name ?? 'Cliente' }}</h1>
            <p class="header-email">{{ profile()?.user?.email ?? user()?.email ?? '' }}</p>
            <span class="type-badge">
              {{ profile()?.typeClient === 'legal' ? 'Persona Jurídica' : (profile()?.typeClient === 'natural' ? 'Persona Natural' : 'Cliente') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Info card -->
      <div class="info-card">
        <h2 class="section-title">Información de la empresa/cliente</h2>
        <hr class="divider" />

        @if (loading()) {
          <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i> Cargando información…
          </div>
        } @else {
          <div class="form-grid">
            <!-- Nombre de Empresa -->
            <div class="field full-width">
              <label><i class="fa-regular fa-building"></i> Nombre / Razón Social</label>
              <input type="text" [(ngModel)]="companyName" placeholder="Ej. Logistics SA" />
            </div>

            <!-- RUC / Documento -->
            <div class="field">
              <label><i class="fa-regular fa-id-card"></i> RUC / Documento</label>
              <input type="text" [(ngModel)]="ruc" placeholder="Número de documento" />
            </div>

            <!-- Tipo de cliente -->
            <div class="field">
              <label><i class="fa-solid fa-tag"></i> Tipo de Cliente</label>
              <select [(ngModel)]="typeClient">
                <option value="legal">Persona Jurídica</option>
                <option value="natural">Persona Natural</option>
              </select>
            </div>

            <!-- Dirección (full width) -->
            <div class="field full-width">
              <label><i class="fa-solid fa-location-dot"></i> Dirección completa</label>
              <input type="text" [(ngModel)]="address" placeholder="Ej. Av. Principal 123" />
            </div>

            <!-- Correo del usuario asociado (readonly) -->
            <div class="field">
              <label><i class="fa-regular fa-envelope"></i> Correo de usuario</label>
              <input
                type="email"
                [value]="profile()?.user?.email ?? user()?.email ?? ''"
                readonly
              />
            </div>
            
            <div class="field">
              <label><i class="fa-regular fa-user"></i> Nombre de usuario</label>
              <input
                type="text"
                [value]="profile()?.user?.name ?? user()?.name ?? ''"
                readonly
              />
            </div>
          </div>

          <div class="form-actions">
            @if (user()?.idClient) {
              <button class="btn-save" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Actualizando…' : 'Actualizar perfil' }}
              </button>
            } @else {
              <button class="btn-save btn-create" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Creando…' : 'Crear perfil' }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
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
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
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
        overflow: hidden;
      }

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .camera-btn {
        position: absolute;
        bottom: -6px;
        right: -6px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #10b981;
        color: white;
        border: 3px solid white;
        display: grid;
        place-items: center;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .camera-btn:hover {
        background: #059669;
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

      .type-badge {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        font-weight: 600;
        padding: 3px 12px;
        border-radius: 20px;
        width: fit-content;
        margin-top: 4px;
        background: #d1fae5;
        color: #059669;
      }

      /* ===== INFO CARD ===== */
      .info-card {
        background: white;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        border: 1px solid #f1f5f9;
      }

      .section-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #10b981;
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
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
        font-family: inherit;
      }

      .field input:focus,
      .field select:focus {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
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
        background: #10b981;
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
        background: #059669;
      }

      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-create {
        background: #3b82f6;
      }

      .btn-create:hover {
        background: #2563eb;
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
    `,
  ],
})
export class ClientProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly ui = inject(InteractionService);

  readonly user = this.auth.user;
  readonly profile = signal<ClientProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  // Campos editables
  companyName = '';
  ruc = '';
  address = '';
  typeClient: 'legal' | 'natural' = 'legal';

  selectedFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProfile();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);

    if (this.photoPreviewUrl()) {
      URL.revokeObjectURL(this.photoPreviewUrl()!);
    }
    if (file) {
      this.photoPreviewUrl.set(URL.createObjectURL(file));
    } else {
      this.photoPreviewUrl.set(null);
    }
  }

  private loadProfile(): void {
    const u = this.user();
    if (!u?.idClient) {
      this.loading.set(false);
      return;
    }

    this.clientService.getProfile(u.idClient).subscribe({
      next: (clientProfile) => {
        this.profile.set(clientProfile);
        this.companyName = clientProfile.companyName ?? '';
        this.ruc = clientProfile.ruc ?? '';
        this.address = clientProfile.address ?? '';
        this.typeClient = clientProfile.typeClient ?? 'legal';
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
    if (!u || this.saving()) return;
    this.saving.set(true);
    this.ui.showLoading();

    const body: any = {
      userId: u.idUser,
      companyName: this.companyName,
      ruc: this.ruc,
      address: this.address,
      typeClient: this.typeClient,
    };
    if (this.selectedFile()) {
      body.photo = this.selectedFile();
    }

    const request$ = u.idClient
      ? this.clientService.updateProfile(u.idClient, body)
      : this.clientService.createProfile(body);

    request$.subscribe({
      next: () => {
        if (!u.idClient) {
          this.auth.refreshSession().subscribe(() => {
            this.ui.hideLoading();
            this.saving.set(false);
            this.ui.showToast('Perfil creado exitosamente', 'success');
            this.loadProfile();
          });
        } else {
          this.ui.hideLoading();
          this.saving.set(false);
          this.ui.showToast('Perfil actualizado', 'success');
          this.loadProfile();
        }
      },
      error: (err) => {
        this.ui.hideLoading();
        this.saving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
