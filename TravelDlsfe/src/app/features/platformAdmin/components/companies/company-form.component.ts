import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../service/company.service';
import { Company } from '../../interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">{{ company ? 'Editar Empresa' : 'Nueva Empresa' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="campo">
            <label for="businessName">Nombre de la Empresa</label>
            <input
              id="businessName"
              class="input-auth"
              type="text"
              formControlName="businessName"
              placeholder="Ej: TransCargo S.A.C."
            />
            @if (form.controls['businessName'].invalid && form.controls['businessName'].touched) {
              <span class="error-text">El nombre es requerido</span>
            }
          </div>

          <div class="campo">
            <label for="ruc">RUC</label>
            <input
              id="ruc"
              class="input-auth"
              type="text"
              formControlName="ruc"
              placeholder="Ej: 20123456789"
            />
            @if (form.controls['ruc'].invalid && form.controls['ruc'].touched) {
              <span class="error-text">RUC requerido (11 dígitos)</span>
            }
          </div>

          <div class="campo">
            <label for="photoUrl">URL de Foto <span class="optional">(opcional)</span></label>
            <input
              id="photoUrl"
              class="input-auth"
              type="url"
              formControlName="photoUrl"
              placeholder="https://..."
            />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">
              Cancelar
            </button>
            <button type="submit" class="btn-enviar" [disabled]="form.invalid || saving">
              {{ saving ? 'Guardando…' : (company ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .modal-wider {
      max-width: 480px !important;
      text-align: left !important;
    }
    .optional {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 400;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    .btn-cancelar-form {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: 0.2s;
    }
    .btn-cancelar-form:hover { background: #f1f5f9; }
    .btn-enviar { flex: 1; font-size: 14px; }
  `,
})
export class CompanyFormComponent implements OnInit {
  @Input() company: Company | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  saving = false;

  readonly form = this.fb.group({
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    photoUrl: [''],
  });

  ngOnInit(): void {
    if (this.company) {
      this.form.patchValue({
        businessName: this.company.businessName,
        ruc: this.company.ruc,
        photoUrl: this.company.photoUrl ?? '',
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
      businessName: raw.businessName!,
      ruc: raw.ruc!,
      photoUrl: raw.photoUrl || null,
    };

    const request$ = this.company
      ? this.svc.update(this.company.idCompany, payload)
      : this.svc.create(payload);

    request$.subscribe({
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
