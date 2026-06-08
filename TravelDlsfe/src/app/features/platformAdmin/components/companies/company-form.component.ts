import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { Company } from '../../interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { UserService } from '../../services/user.service';

interface UserOption {
  idUser: number;
  name: string;
  email: string;
}

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

          <!-- Usuario asignado (solo al crear) -->
          @if (!company) {
            <div class="campo">
              <label for="userId">
                Usuario Empresa <span class="req-mark">*</span>
              </label>

              @if (loadingUsers()) {
                <div class="users-loading">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios…
                </div>
              } @else if (users().length === 0) {
                <div class="users-empty">
                  <i class="fa-solid fa-circle-exclamation"></i>
                  No hay usuarios con rol "Empresa". Regístralos primero en la sección Usuarios.
                </div>
              } @else {
                <select id="userId" class="input-auth" formControlName="userId">
                  <option [ngValue]="null" disabled selected hidden>Seleccionar usuario…</option>
                  @for (u of users(); track u.idUser) {
                    <option [value]="u.idUser">{{ u.name }} — {{ u.email }}</option>
                  }
                </select>
              }

              @if (form.controls['userId'].invalid && form.controls['userId'].touched) {
                <span class="error-text">Debes seleccionar un usuario</span>
              }
            </div>
          }

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
            <label>Foto / Logo <span class="optional">(opcional)</span></label>
            <div class="file-upload-wrapper">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                (change)="onFileSelected($event)"
                class="file-input"
              />
              @if (photoPreviewUrl()) {
                <img [src]="photoPreviewUrl()!" alt="Preview" class="photo-preview" />
              } @else if (company?.photoUrl) {
                <img [src]="company?.photoUrl" alt="Foto actual" class="photo-preview" />
              }
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-enviar"
              [disabled]="form.invalid || saving() || (loadingUsers() && !company)"
            >
              {{ saving() ? 'Guardando…' : (company ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .file-upload-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .file-input {
      font-size: 14px;
      color: #64748b;
    }
    .photo-preview {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
    }
  `,
})
export class CompanyFormComponent implements OnInit {
  @Input() company: Company | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(CompanyService);
  private readonly ui  = inject(InteractionService);
  private readonly userService = inject(UserService);

  saving = signal(false);
  users = signal<UserOption[]>([]);
  loadingUsers = signal(false);

  selectedFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    userId:       [null as number | null],
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    ruc:          ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
  });

  ngOnInit(): void {
    if (this.company) {
      // Edit mode: patch values, userId not required
      this.form.patchValue({
        businessName: this.company.businessName,
        ruc:          this.company.ruc,
      });
    } else {
      // Create mode: userId required
      this.form.controls['userId'].setValidators([Validators.required]);
      this.form.controls['userId'].updateValueAndValidity();
      this.loadUsers();
    }
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

  loadUsers(): void {
    this.loadingUsers.set(true);
    // Fetch unassigned users with role "company"
    this.userService.getUnassignedCompanyUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
        this.ui.showToast('No se pudieron cargar los usuarios', 'error');
      },
    });
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.cancelled.emit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const payload: any = {
      businessName: raw.businessName!,
      ruc:          raw.ruc!,
    };

    if (this.selectedFile()) {
      payload.photo = this.selectedFile();
    }

    if (!this.company && raw.userId) {
      payload['userId'] = Number(raw.userId);
    }

    const request$ = this.company
      ? this.svc.update(this.company.idCompany, payload)
      : this.svc.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
