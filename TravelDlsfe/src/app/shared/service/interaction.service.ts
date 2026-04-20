import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InteractionService {
  // Signals para controlar la UI
  cargando = signal(false);
  toast = signal<{ msg: string; tipo: string } | null>(null);
  alerta = signal<{ titulo: string; msg: string; resolver: (v: boolean) => void } | null>(null);
  error = signal<{ titulo: string; msg: string; btnOk: string } | null>(null);

  // Cargando
  showLoading() {
    this.cargando.set(true);
  }

  hideLoading() {
    this.cargando.set(false);
  }

  // Mensaje
  showToast(msg: string, tipo: 'success' | 'error' | 'warning' = 'success') {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 3000);
  }

  // Confirmación (Promesa)
  async confirmar(titulo: string, msg: string): Promise<boolean> {
    return new Promise((res) => {
      this.alerta.set({
        titulo,
        msg,
        resolver: (v) => {
          this.alerta.set(null);
          res(v);
        },
      });
    });
  }

  // Abre modal de error
  async showError(titulo: string, msg: string, btnOk: string = 'Aceptar') {
    this.error.set({
      titulo,
      msg,
      btnOk,
    });
  }

  // Cierra el modal de error
  cerrarError() {
    this.error.set(null);
  }

  // Procesa el error del backend y lo muestra en el modal
  async mostrarError(err: any) {
    const backendMessage =
      err?.error?.detail ||
      err?.error?.message ||
      err?.error?.title ||
      err?.message ||
      'Error desconocido';

    this.showError('Ops!', backendMessage, 'Cerrar');
  }
}
