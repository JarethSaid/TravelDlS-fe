import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { Client } from '../../interface/client.interface';
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
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageCropperModalComponent],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">{{ client ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <!-- Usuario asignado (solo al crear) -->
          @if (!client) {
            <div class="campo">
              <label for="userId">
                Usuario Cliente <span class="req-mark">*</span>
              </label>

              @if (loadingUsers()) {
                <div class="users-loading">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios…
                </div>
              } @else if (users().length === 0) {
                <div class="users-empty">
                  <i class="fa-solid fa-circle-exclamation"></i>
                  No hay usuarios con rol "Cliente" sin asignar. Regístralos primero en la sección Usuarios.
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
              } @else if (client?.photoUrl) {
                <img [src]="client!.photoUrl" alt="Foto actual" class="photo-preview" />
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
              [disabled]="form.invalid || saving() || (loadingUsers() && !client) || (!client && users().length === 0)"
            >
              {{ saving() ? 'Guardando…' : (client ? 'Actualizar' : 'Crear') }}
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
export class ClientFormComponent implements OnInit {
  @Input() client: Client | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb          = inject(FormBuilder);
  private readonly svc         = inject(ClientService);
  private readonly ui          = inject(InteractionService);
  private readonly userService = inject(UserService);

  saving       = signal(false);
  users        = signal<UserOption[]>([]);
  loadingUsers = signal(false);

  selectedFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);
  imageChangedEvent = signal<any>('');

  readonly form = this.fb.group({
    userId:      [null as number | null],
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    ruc:         ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    address:     ['', [Validators.required]],
    typeClient:  ['legal' as 'legal' | 'natural', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.client) {
      // Modo edición: parchear valores, userId no es requerido
      this.form.patchValue({
        companyName: this.client.companyName,
        ruc:         this.client.ruc,
        address:     this.client.address,
        typeClient:  this.client.typeClient,
      });
    } else {
      // Modo creación: userId requerido, cargar usuarios sin asignar
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
    
    // Reset input file value
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
    this.userService.getUnassignedClientUsers().subscribe({
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
      companyName: raw.companyName!,
      ruc:         raw.ruc!,
      address:     raw.address!,
      typeClient:  raw.typeClient as 'legal' | 'natural',
    };

    if (this.selectedFile()) {
      payload.photo = this.selectedFile();
    }

    if (!this.client && raw.userId) {
      payload['userId'] = Number(raw.userId);
    }

    const request$ = this.client
      ? this.svc.update(this.client.idClient, payload)
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
