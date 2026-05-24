import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../interface/category.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">{{ category ? 'Editar Categoría' : 'Nueva Categoría' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="campo">
            <label for="nameCategory">Nombre de Categoría</label>
            <input
              id="nameCategory"
              class="input-auth"
              type="text"
              formControlName="nameCategory"
              placeholder="Ej: Carga Pesada"
            />
            @if (form.controls['nameCategory'].invalid && form.controls['nameCategory'].touched) {
              <span class="error-text">El nombre es requerido</span>
            }
          </div>

          <div class="campo">
            <label for="statusCat">Estado</label>
            <select id="statusCat" class="input-auth" formControlName="status">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-enviar" [disabled]="form.invalid || saving">
              {{ saving ? 'Guardando…' : (category ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .modal-wider { max-width: 420px !important; text-align: left !important; }
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
export class CategoryFormComponent implements OnInit {
  @Input() category: Category | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CategoryService);
  private readonly ui = inject(InteractionService);

  saving = false;

  readonly form = this.fb.group({
    nameCategory: ['', [Validators.required, Validators.minLength(2)]],
    status: ['activo', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.category) {
      this.form.patchValue({
        nameCategory: this.category.nameCategory,
        status: this.category.status,
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
    const payload = { nameCategory: raw.nameCategory!, status: raw.status! };

    const request$ = this.category
      ? this.svc.update(this.category.idCategory, payload)
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
