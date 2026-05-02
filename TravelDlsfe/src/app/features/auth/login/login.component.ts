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
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(InteractionService);

  submitting = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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
        this.submitting = false;
        this.ui.showToast('Sesión iniciada', 'success');
        if (user.role === 'platform_admin') {
          void this.router.navigate(['/admin/dashboard']);
        } else if (user.role === 'driver') {
          void this.router.navigate(['/driver/dashboard']);
        } else {
          void this.router.navigate(['/dashboard']);
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
