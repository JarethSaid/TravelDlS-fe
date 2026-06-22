import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { Company } from '../../interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { UserService } from '../../services/user.service';
import { ImageCropperModalComponent } from '../../../../shared/components/image-cropper-modal/image-cropper-modal.component';

interface UserOption {
  idUser: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageCropperModalComponent],
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
              maxlength="20"
            />
            @if (form.controls['ruc'].invalid && form.controls['ruc'].touched) {
              <span class="error-text">RUC requerido (máximo 20 dígitos)</span>
            }
          </div>

          <div class="campo">
            <label>Foto / Logo <span class="optional">(opcional)</span></label>
            <div class="upload-zone" (click)="fileInput.click()" [class.upload-zone--has-image]="photoPreviewUrl() || company?.photoUrl">
              <input
                #fileInput
                type="file"
                accept="image/jpeg,image/png,image/webp"
                (change)="onFileSelected($event)"
                style="display: none;"
              />
              @if (photoPreviewUrl() || company?.photoUrl) {
                <div class="upload-preview">
                  <img [src]="photoPreviewUrl() || company!.photoUrl" alt="Preview" class="photo-preview" />
                  <div class="upload-preview-overlay">
                    <i class="fa-solid fa-camera"></i>
                    <span>Cambiar foto</span>
                  </div>
                </div>
              } @else {
                <div class="upload-placeholder">
                  <div class="upload-icon-wrap">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <p class="upload-title">Seleccionar imagen</p>
                  <p class="upload-hint">JPG, PNG o WEBP &middot; M&aacute;x 5MB</p>
                </div>
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
      
      @if (imageChangedEvent()) {
        <app-image-cropper-modal
          [imageChangedEvent]="imageChangedEvent()"
          [roundCropper]="true"
          (croppedImage)="onImageCropped($event)"
          (cancelled)="cancelCrop()"
        ></app-image-cropper-modal>
      }
    </div>
  `,
  styles: `
    .upload-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 140px;
      border: 2px dashed #c7d2fe;
      border-radius: 16px;
      background: #f5f3ff;
      cursor: pointer;
      transition: all 0.25s ease;
      overflow: hidden;
      position: relative;
    }
    .upload-zone:hover {
      border-color: #3d39af;
      background: #ede9fe;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(61, 57, 175, 0.1);
    }
    .upload-zone--has-image {
      border-style: solid;
      border-color: #a5b4fc;
      background: #f8fafc;
      min-height: 120px;
    }
    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 24px;
      text-align: center;
    }
    .upload-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #e0e7ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #3d39af;
      margin-bottom: 4px;
      transition: all 0.2s;
    }
    .upload-zone:hover .upload-icon-wrap {
      background: #c7d2fe;
      transform: scale(1.08);
    }
    .upload-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #3d39af;
    }
    .upload-hint {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .upload-preview {
      position: relative;
      width: 100%;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-preview {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #a5b4fc;
      box-shadow: 0 4px 12px rgba(61, 57, 175, 0.15);
    }
    .upload-preview-overlay {
      position: absolute;
      inset: 0;
      background: rgba(61, 57, 175, 0.0);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      border-radius: 16px;
      opacity: 0;
      transition: all 0.2s;
    }
    .upload-preview-overlay i {
      font-size: 20px;
    }
    .upload-zone:hover .upload-preview-overlay {
      opacity: 1;
      background: rgba(61, 57, 175, 0.45);
    }
    .upload-zone:hover .photo-preview {
      filter: brightness(0.75);
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
  imageChangedEvent = signal<any>('');

  readonly form = this.fb.group({
    userId:       [null as number | null],
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    ruc:          ['', [Validators.required, Validators.maxLength(20)]],
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
    if (input.files?.length) {
      this.imageChangedEvent.set(event);
    }
  }

  onImageCropped(file: File | null): void {
    this.imageChangedEvent.set('');
    this.selectedFile.set(file);

    if (this.photoPreviewUrl()) {
      URL.revokeObjectURL(this.photoPreviewUrl()!);
    }
    if (file) {
      this.photoPreviewUrl.set(URL.createObjectURL(file));
    } else {
      this.photoPreviewUrl.set(null);
    }
    
    // Attempt to reset the input value so the same file can be selected again
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }

  cancelCrop(): void {
    this.imageChangedEvent.set('');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
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
