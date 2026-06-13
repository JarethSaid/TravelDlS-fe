import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent],
  template: `
    <div class="modal-fondo">
      <div class="modal-caja custom-cropper-modal">
        <button class="boton-cerrar" (click)="close()">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <h3 class="modal-titulo">Ajustar Imagen</h3>
        
        <div class="cropper-container">
          <image-cropper
            [imageChangedEvent]="imageChangedEvent"
            [maintainAspectRatio]="true"
            [aspectRatio]="1 / 1"
            [roundCropper]="roundCropper"
            format="png"
            (imageCropped)="imageCropped($event)"
            [style.max-height.px]="400"
            [resizeToWidth]="600">
          </image-cropper>
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" (click)="close()">Cancelar</button>
          <button class="btn-confirmar" (click)="confirm()">Recortar y Guardar</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .custom-cropper-modal {
        max-width: 500px !important;
        width: 100%;
      }
      .cropper-container {
        width: 100%;
        max-height: 500px;
        overflow: hidden;
        border-radius: 12px;
        background: #f1f5f9;
        margin-bottom: 24px;
        border: 2px dashed #e2e8f0;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .btn-cancelar {
        background: white;
        border: 1px solid #cbd5e1;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        color: #475569;
        transition: 0.2s;
      }
      .btn-cancelar:hover {
        background: #f1f5f9;
      }
      .btn-confirmar {
        background: #3d39af;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        color: white;
        transition: 0.2s;
      }
      .btn-confirmar:hover {
        background: #2d2a8a;
      }
    `
  ]
})
export class ImageCropperModalComponent {
  @Input() imageChangedEvent: any = '';
  @Input() roundCropper: boolean = true;
  @Output() croppedImage = new EventEmitter<File | null>();
  @Output() cancelled = new EventEmitter<void>();

  croppedBlob: Blob | null | undefined = null;

  imageCropped(event: ImageCroppedEvent) {
    this.croppedBlob = event.blob;
  }

  close() {
    this.cancelled.emit();
  }

  confirm() {
    if (this.croppedBlob) {
      // Convertir Blob a File
      const file = new File([this.croppedBlob], 'profile-photo.png', { type: 'image/png' });
      this.croppedImage.emit(file);
    } else {
      this.croppedImage.emit(null);
    }
  }
}
