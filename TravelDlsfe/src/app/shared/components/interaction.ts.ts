import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../service/interaction.service';

@Component({
  selector: 'app-interaction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Spinner -->
    @if (srv.cargando()) {
      <div class="overlay"><div class="spinner"></div></div>
    }

    <!-- Toast / Notificación -->
    @if (srv.toast(); as t) {
      <div
        class="ia-notificacion"
        [style.background]="
          t.tipo === 'success' ? '#2ecc71' : t.tipo === 'error' ? '#e74c3c' : '#f39c12'
        "
      >
        {{ t.msg }}
      </div>
    }

    <!-- Alerta/Confirmación -->
    @if (srv.alerta(); as a) {
      <div class="overlay">
        <div class="caja border-azul">
          <div class="icono-alerta">?</div>
          <h3 class="titulo-alerta">{{ a.titulo }}</h3>
          <p>{{ a.msg }}</p>
          <div class="btns">
            <button class="btn-cancelar" (click)="a.resolver(false)">Cancelar</button>
            <button class="principal" (click)="a.resolver(true)">Aceptar</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal de error -->
    @if (srv.error(); as e) {
      <div class="overlay">
        <div class="caja border-rojo">
          <div class="icono-error">✕</div>
          <h3 class="titulo-error">{{ e.titulo }}</h3>
          <p>{{ e.msg }}</p>
          <div class="btns">
            <button class="btn-error" (click)="srv.cerrarError()">{{ e.btnOk }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99998;
      display: grid;
      place-items: center;
      backdrop-filter: blur(2px);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #eee;
      border-top-color: #3d39af;
      border-radius: 50%;
      animation: s 1s linear infinite;
    }

    @keyframes s {
      to {
        transform: rotate(360deg);
      }
    }

    .ia-notificacion {
      position: fixed !important;
      top: 90px !important;
      right: 20px !important;
      left: auto !important;
      width: auto !important;
      min-width: 250px !important;
      max-width: 350px !important;
      height: auto !important;
      padding: 16px 24px !important;
      color: white !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
      display: block !important;
      z-index: 99999 !important;
      animation: entrarDerecha 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    }

    @keyframes entrarDerecha {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* CAJA BASE PARA AMBOS MODALES */
    .caja {
      background: white;
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      width: 320px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    /* ESTILOS ESPECÍFICOS ALERTA / CONFIRMACIÓN */
    .border-azul {
      border-top: 5px solid #3d39af;
    }
    .icono-alerta {
      width: 50px;
      height: 50px;
      background: #ebf0ff;
      color: #3d39af;
      border-radius: 50%;
      display: grid;
      place-items: center;
      margin: 0 auto 15px;
      font-weight: bold;
      font-size: 22px;
    }
    .titulo-alerta {
      color: #3d39af;
      margin-bottom: 10px;
    }
    .btn-cancelar {
      background: #f1f2f6;
      color: #2d3436;
    }
    .btn-cancelar:hover {
      background: #dfe4ea;
    }

    /* ESTILOS ESPECÍFICOS ERROR */
    .border-rojo {
      border-top: 5px solid #e74c3c;
    }
    .icono-error {
      width: 50px;
      height: 50px;
      background: #fdeaea;
      color: #e74c3c;
      border-radius: 50%;
      display: grid;
      place-items: center;
      margin: 0 auto 15px;
      font-weight: bold;
      font-size: 20px;
    }
    .titulo-error {
      color: #c0392b;
      margin-bottom: 10px;
    }
    .btn-error {
      background: #e74c3c;
      color: white;
      width: 100%;
      padding: 12px;
      font-weight: bold;
      border: none;
      border-radius: 10px;
      cursor: pointer;
    }

    /* BOTONES GENERALES */
    .btns {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: center;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      transition: 0.2s;
    }
    .principal {
      background: #3d39af;
      color: white;
    }
    .principal:hover {
      background: #2d2a8a;
    }
  `,
})
export class InteractionComponent {
  srv = inject(InteractionService);
}
