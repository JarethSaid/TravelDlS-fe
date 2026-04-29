import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TruckService } from '../../service/truck.service';
import { Truck } from '../../interface/truck.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-truck-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">{{ truck ? 'Editar Camión' : 'Nuevo Camión' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="campo">
            <label for="plate">Placa</label>
            <input id="plate" class="input-auth" type="text" formControlName="plate" placeholder="Ej: ABC-123" />
            @if (form.controls['plate'].invalid && form.controls['plate'].touched) {
              <span class="error-text">La placa es requerida</span>
            }
          </div>

          <div class="campo">
            <label for="chassis">Chasis</label>
            <input id="chassis" class="input-auth" type="text" formControlName="chassis" placeholder="Ej: WDB9634031L123456" />
            @if (form.controls['chassis'].invalid && form.controls['chassis'].touched) {
              <span class="error-text">El chasis es requerido</span>
            }
          </div>

          <div class="campo">
            <label for="idCompanyT">ID Empresa</label>
            <input id="idCompanyT" class="input-auth" type="number" formControlName="idCompany" placeholder="ID de la empresa" />
            @if (form.controls['idCompany'].invalid && form.controls['idCompany'].touched) {
              <span class="error-text">El ID de empresa es requerido</span>
            }
          </div>

          <div class="campo">
            <label for="idDriverT">ID Conductor <span class="optional">(opcional)</span></label>
            <input id="idDriverT" class="input-auth" type="number" formControlName="idDriver" placeholder="ID del conductor" />
          </div>

          <div class="campo">
            <label for="idCategoryT">ID Categoría <span class="optional">(opcional)</span></label>
            <input id="idCategoryT" class="input-auth" type="number" formControlName="idCategory" placeholder="ID de categoría" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-enviar" [disabled]="form.invalid || saving">
              {{ saving ? 'Guardando…' : (truck ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .modal-wider { max-width: 480px !important; text-align: left !important; }
    .optional { color: #94a3b8; font-size: 12px; font-weight: 400; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .btn-cancelar-form {
      flex: 1; padding: 12px; border-radius: 12px;
      border: 1.5px solid #e2e8f0; background: white;
      color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; transition: 0.2s;
    }
    .btn-cancelar-form:hover { background: #f1f5f9; }
    .btn-enviar { flex: 1; font-size: 14px; }
  `,
})
export class TruckFormComponent implements OnInit {
  @Input() truck: Truck | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TruckService);
  private readonly ui = inject(InteractionService);

  saving = false;

  readonly form = this.fb.group({
    plate: ['', [Validators.required]],
    chassis: ['', [Validators.required]],
    idCompany: [null as number | null, [Validators.required]],
    idDriver: [null as number | null],
    idCategory: [null as number | null],
  });

  ngOnInit(): void {
    if (this.truck) {
      this.form.patchValue({
        plate: this.truck.plate,
        chassis: this.truck.chassis,
        idCompany: this.truck.idCompany,
        idDriver: this.truck.idDriver,
        idCategory: this.truck.idCategory,
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
      plate: raw.plate!,
      chassis: raw.chassis!,
      idCompany: raw.idCompany!,
      idDriver: raw.idDriver ?? undefined,
      idCategory: raw.idCategory ?? undefined,
    };

    const request$ = this.truck
      ? this.svc.update(this.truck.idTruck, payload)
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
