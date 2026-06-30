import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InteractionService } from '../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../core/http/http-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card modal-caja">
        <div class="auth-brand">
          <div class="auth-logo" aria-hidden="true">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
          <h1 class="modal-titulo" style="margin-bottom: 8px">TravelDLS</h1>
          <p class="auth-sub">Portal de clientes — envíos de carga pesada</p>
        </div>

        <form class="form-auth" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="campo">
            <label for="email">Correo</label>
            <input
              id="email"
              class="input-auth"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="tu@correo.com"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <span class="error-text">Correo no válido</span>
            }
          </div>

          <div class="campo">
            <label for="password">Contraseña</label>
            <input
              id="password"
              class="input-auth"
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <span class="error-text">Mínimo 6 caracteres</span>
            }
          </div>

          <button class="btn-enviar" type="submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="link-cambio">
          ¿No tienes cuenta?
          <a routerLink="/register">Crear cuenta</a>
        </p>

      </div>
      <div class="help-floating" [class.help-floating--open]="showHelp">
        @if (showHelp) {
          <section id="login-help-panel" class="help-panel" aria-labelledby="login-help-title">
            <div class="help-panel__header">
              <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
              <h2 id="login-help-title">Ayuda para crear tu cuenta</h2>
            </div>

            <div class="help-panel__section">
              <h3>Cuenta de cliente</h3>
              <p>
                Si deseas solicitar envíos o revisar tus órdenes, puedes crear tu cuenta desde
                <a routerLink="/register">Crear cuenta</a>. Ese registro está pensado para clientes
                que necesitan cotizar y dar seguimiento a servicios de carga pesada.
              </p>
            </div>

            <div class="help-panel__section">
              <h3>Cuenta de empresa</h3>
              <p>
                Las cuentas de empresa no se crean desde el registro público. Para solicitar una,
                escribe a los administradores e incluye el nombre de la empresa, RUC, nombre de
                contacto y teléfono para que puedan validar la información.
              </p>
            </div>

            <div class="help-panel__section">
              <h3>Cuenta de conductor</h3>
              <p>
                Los conductores no deben registrarse por su cuenta. La empresa a la que pertenecen,
                o el administrador general, crea o vincula su acceso para que puedan usar el panel
                de conductor correctamente.
              </p>
            </div>

            <div class="help-panel__contact">
              <span>Contactos para empresas</span>
              <a href="mailto:Jarethsaidbonillac@gmail.com">Jarethsaidbonillac@gmail.com</a>
              <a href="mailto:elsacerdaugarte@gmail.com">elsacerdaugarte@gmail.com</a>
              <a href="mailto:Ashleycastro@gmail.com">Ashleycastro@gmail.com</a>
            </div>
          </section>
        }

        <button
          class="help-button"
          type="button"
          (click)="toggleHelp()"
          [attr.aria-expanded]="showHelp"
          aria-controls="login-help-panel"
          [attr.aria-label]="showHelp ? 'Cerrar ayuda para crear cuenta' : 'Abrir ayuda para crear cuenta'"
          title="Ayuda para crear cuenta"
        >
          <i [class]="showHelp ? 'fa-solid fa-xmark' : 'fa-solid fa-circle-question'" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      box-sizing: border-box;
      background: linear-gradient(145deg, #eef0ff 0%, #e8f4fc 45%, #f5f7fa 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      box-sizing: border-box;
    }
    .auth-brand {
      margin-bottom: 8px;
    }
    .auth-logo {
      width: 56px;
      height: 56px;
      margin: 0 auto 12px;
      border-radius: 16px;
      background: linear-gradient(135deg, #3d39af, #5c58d6);
      color: white;
      display: grid;
      place-items: center;
      font-size: 24px;
      box-shadow: 0 12px 30px rgba(61, 57, 175, 0.35);
    }
    .auth-sub {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }
    .link-cambio a {
      color: inherit;
      text-decoration: underline;
      margin-left: 4px;
    }
    .help-floating {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      pointer-events: none;
    }
    .help-panel,
    .help-button {
      pointer-events: auto;
    }
    .help-button {
      width: 54px;
      height: 54px;
      border: none;
      border-radius: 50%;
      background: #3d39af;
      color: white;
      display: grid;
      place-items: center;
      font-size: 21px;
      cursor: pointer;
      box-shadow: 0 14px 32px rgba(61, 57, 175, 0.35);
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    .help-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 38px rgba(61, 57, 175, 0.42);
      background: #34309b;
    }
    .help-button:focus-visible {
      outline: 3px solid rgba(61, 57, 175, 0.25);
      outline-offset: 4px;
    }
    .help-panel {
      width: 340px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 112px);
      overflow-y: auto;
      padding: 18px;
      border: 1px solid #dbe4ff;
      border-radius: 18px;
      background: #ffffff;
      color: #475569;
      text-align: left;
      box-sizing: border-box;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    }
    .help-panel__header {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #3d39af;
      margin-bottom: 14px;
    }
    .help-panel__header i {
      font-size: 18px;
      flex: 0 0 auto;
    }
    .help-panel h2,
    .help-panel h3,
    .help-panel p {
      margin: 0;
    }
    .help-panel h2 {
      font-size: 16px;
      line-height: 1.3;
      font-weight: 800;
    }
    .help-panel h3 {
      color: #1e293b;
      font-size: 13px;
      line-height: 1.35;
      font-weight: 800;
      margin-bottom: 5px;
    }
    .help-panel p {
      font-size: 12px;
      line-height: 1.55;
    }
    .help-panel__section + .help-panel__section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .help-panel a {
      color: #3d39af;
      font-weight: 700;
      overflow-wrap: anywhere;
      text-decoration: underline;
    }
    .help-panel__contact {
      margin-top: 14px;
      padding: 12px;
      border-radius: 14px;
      background: #f8faff;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      line-height: 1.4;
    }
    .help-panel__contact span {
      color: #1e293b;
      font-weight: 800;
    }
    @media (max-width: 480px) {
      .auth-shell {
        padding: 16px;
      }
      .auth-card {
        padding: 28px 16px;
      }
      .help-floating {
        right: 16px;
        bottom: 16px;
      }
      .help-panel {
        width: calc(100vw - 32px);
        padding: 16px;
      }
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(InteractionService);

  submitting = false;
  showHelp = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.ui.showLoading();
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: (user) => {
        this.ui.hideLoading();
        this.ui.showToast('Sesión iniciada', 'success');
        if (user.role === 'platform_admin') {
          void this.router.navigate(['/admin/dashboard']);
        } else if (user.role === 'driver') {
          void this.router.navigate(['/driver/dashboard']);
        } else if (user.role === 'company') {
          void this.router.navigate(['/company/dashboard']);
        } else if (user.role === 'client') {
          void this.router.navigate(['/client/dashboard']);
        } else {
          void this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.ui.hideLoading();
        this.submitting = false;
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
