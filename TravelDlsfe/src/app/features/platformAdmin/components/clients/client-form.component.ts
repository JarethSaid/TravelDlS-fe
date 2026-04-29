import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../service/client.service';
import { Client } from '../../interface/client.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">{{ client ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="campo">
            <label for="companyName">Nombre / Empresa</label>
            <input id="companyName" class="input-auth" type="text" formControlName="companyName" placeholder="Ej: Minera Los Andes S.A." />
            @if (form.controls['companyName'].invalid && form.controls['companyName'].touched) {
              <span class="error-text">El nombre es requerido</span>
            }
          </div>

          <div class="campo">
            <label for="rucC">RUC</label>
            <input id="rucC" class="input-auth" type="text" formControlName="ruc" placeholder="Ej: 20111222333" />
            @if (form.controls['ruc'].invalid && form.controls['ruc'].touched) {
              <span class="error-text">RUC requerido (11 dígitos)</span>
            }
          </div>

          <div class="campo">
            <label for="address">Dirección</label>
            <input id="address" class="input-auth" type="text" formControlName="address" placeholder="Ej: Av. Javier Prado 1234, Lima" />
            @if (form.controls['address'].invalid && form.controls['address'].touched) {
              <span class="error-text">La dirección es requerida</span>
            }
          </div>

          <div class="campo">
            <label for="typeClient">Tipo de Cliente</label>
            <select id="typeClient" class="input-auth" formControlName="typeClient">
              <option value="legal">Jurídica</option>
              <option value="natural">Natural</option>
            </select>
          </div>

          <div class="campo">
            <label for="photoUrlC">URL de Foto <span class="optional">(opcional)</span></label>
            <input id="photoUrlC" class="input-auth" type="url" formControlName="photoUrl" placeholder="https://..." />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-enviar" [disabled]="form.invalid || saving">
              {{ saving ? 'Guardando…' : (client ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .modal-wider { max-width: 500px !important; text-align: left !important; }
    .optional { color: #94a3b8; font-size: 12px; font-weight: 400; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .btn-cancelar-form {
      flex: 1; padding: 12px; border-radius: 12px;
      border: 1.5px solid #e2e8f0; background: white;
      color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; transition: 0.2s;
    }
    .btn-cancelar-form:hover { background: #f1f5f9; }
    .btn-enviar { flex: 1; font-size: 14px; }
    select.input-auth { cursor: pointer; }
  `,
})
export class ClientFormComponent implements OnInit {
  @Input() client: Client | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ClientService);
  private readonly ui = inject(InteractionService);

  saving = false;

  readonly form = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    address: ['', [Validators.required]],
    typeClient: ['legal' as 'legal' | 'natural', [Validators.required]],
    photoUrl: [''],
  });

  ngOnInit(): void {
    if (this.client) {
      this.form.patchValue({
        companyName: this.client.companyName,
        ruc: this.client.ruc,
        address: this.client.address,
        typeClient: this.client.typeClient,
        photoUrl: this.client.photoUrl ?? '',
      });
    }
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.cancelled.emit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();
    const payload = {
      companyName: raw.companyName!,
      ruc: raw.ruc!,
      address: raw.address!,
      typeClient: raw.typeClient as 'legal' | 'natural',
      photoUrl: raw.photoUrl || null,
    };

    // Platform admin can only create (update is for client role)
    this.svc.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
      },
      error: (err) => {
        this.saving = false;
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
