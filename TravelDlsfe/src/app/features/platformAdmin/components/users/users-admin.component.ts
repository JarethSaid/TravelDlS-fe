import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

interface Role {
  id: number;
  name: string;
  label: string;
}

const ROLES: Role[] = [
  { id: 1, name: 'driver',         label: 'Conductor' },
  { id: 2, name: 'company',        label: 'Empresa' },
  { id: 3, name: 'client',         label: 'Cliente' },
  { id: 4, name: 'platform_admin', label: 'Platform Admin' },
];

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div>
      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestión de Usuarios</h1>
          <p class="page-sub">Registra nuevos usuarios y asigna roles al sistema</p>
        </div>
      </div>

      <!-- Registration Card -->
      <div class="reg-card">
        <div class="reg-card-header">
          <div class="reg-icon">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <h2 class="reg-title">Nuevo Usuario</h2>
            <p class="reg-sub">Completa los datos para crear una cuenta en el sistema</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="reg-form">
          <!-- Row 1: Nombre + Email -->
          <div class="form-row">
            <div class="campo">
              <label for="userName">Nombre completo</label>
              <input
                id="userName"
                class="input-auth"
                type="text"
                formControlName="name"
                placeholder="Ej: Juan García López"
              />
              @if (form.controls['name'].invalid && form.controls['name'].touched) {
                <span class="error-text">El nombre es requerido (mín. 2 caracteres)</span>
              }
            </div>
            <div class="campo">
              <label for="userEmail">Correo electrónico</label>
              <input
                id="userEmail"
                class="input-auth"
                type="email"
                formControlName="email"
                placeholder="Ej: juan@empresa.com"
              />
              @if (form.controls['email'].invalid && form.controls['email'].touched) {
                <span class="error-text">Ingresa un email válido</span>
              }
            </div>
          </div>

          <!-- Row 2: Password + Rol -->
          <div class="form-row">
            <div class="campo">
              <label for="userPassword">Contraseña</label>
              <div class="password-wrapper">
                <input
                  id="userPassword"
                  class="input-auth"
                  [type]="showPass ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" class="toggle-pass" (click)="showPass = !showPass">
                  <i [class]="showPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
                </button>
              </div>
              @if (form.controls['password'].invalid && form.controls['password'].touched) {
                <span class="error-text">Contraseña requerida (mín. 8 caracteres)</span>
              }
            </div>
            <div class="campo">
              <label for="userRole">Rol del usuario</label>
              <select id="userRole" class="input-auth" formControlName="roleId">
                <option value="" disabled>Seleccionar rol…</option>
                @for (r of roles; track r.id) {
                  <option [value]="r.id">{{ r.label }}</option>
                }
              </select>
              @if (form.controls['roleId'].invalid && form.controls['roleId'].touched) {
                <span class="error-text">Selecciona un rol</span>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="resetForm()">
              <i class="fa-solid fa-rotate-left"></i> Limpiar
            </button>
            <button type="submit" class="btn-enviar" [disabled]="form.invalid || saving()">
              @if (saving()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Guardando…
              } @else {
                <i class="fa-solid fa-user-plus"></i> Registrar Usuario
              }
            </button>
          </div>
        </form>
      </div>

      <!-- Success toast is handled by InteractionService -->

      <!-- Recent info note -->
      <div class="info-note">
        <i class="fa-solid fa-circle-info"></i>
        <span>Los usuarios registrados podrán iniciar sesión con su email y contraseña. El rol determina a qué secciones tendrán acceso.</span>
      </div>
    </div>
  `,
  styles: `
    .reg-card {
      background: white;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      padding: 32px;
      margin-bottom: 20px;
    }
    .reg-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    .reg-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #3d39af, #5c58d6);
      display: grid;
      place-items: center;
      color: white;
      font-size: 20px;
      flex-shrink: 0;
    }
    .reg-title {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .reg-sub {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .reg-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .password-wrapper {
      position: relative;
      width: 100%;
    }
    .password-wrapper .input-auth {
      padding-right: 44px;
    }
    .toggle-pass {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 15px;
      padding: 4px;
      transition: color 0.2s;
    }
    .toggle-pass:hover { color: #3d39af; }
    .info-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f0f4ff;
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      color: #4338ca;
    }
    .info-note i { margin-top: 2px; flex-shrink: 0; }
  `,
})
export class UsersAdminComponent {
  private readonly userService = inject(UserService);
  private readonly ui = inject(InteractionService);
  private readonly fb = inject(FormBuilder);

  readonly roles = ROLES;
  saving = signal(false);
  showPass = false;

  readonly form = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(2)]],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    roleId:   ['' as any, [Validators.required]],
  });

  resetForm(): void {
    this.form.reset();
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      name:     raw.name!,
      email:    raw.email!,
      password: raw.password!,
      roleId:   Number(raw.roleId),
    };

    this.userService.registerUser(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.ui.showToast(`Usuario "${payload.name}" registrado exitosamente`, 'success');
        this.form.reset();
      },
      error: (err) => {
        this.saving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
