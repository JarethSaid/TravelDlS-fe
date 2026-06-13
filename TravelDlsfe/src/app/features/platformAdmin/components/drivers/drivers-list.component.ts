import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { DriverService, DriverUpdatePayload } from '../../services/driver.service';
import { DriverLinkFormComponent } from './driver-link-form.component';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { ImageCropperModalComponent } from '../../../../shared/components/image-cropper-modal/image-cropper-modal.component';

interface Driver {
  idDriver: number;
  userId: number;
  license: string;
  passport: string;
  status: string;
  photoUrl: string | null;
  deletedAt: string | null;
  idCompany: number;
  company?: { idCompany: number; businessName: string; ruc: string };
  user?: { name: string; email: string };
}

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverLinkFormComponent, ImageCropperModalComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1 class="page-title">Conductores</h1>
          <p class="page-sub">{{ total() }} conductores registrados</p>
        </div>
        <div class="header-actions">
          <button
            class="btn-refresh"
            [class.spinning]="loading()"
            (click)="refresh()"
            title="Actualizar lista"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="btn-nuevo" (click)="showLinkForm.set(true)">
            <i class="fa-solid fa-link"></i> Vincular a Empresa
          </button>
        </div>
      </div>

      <!-- Search bar -->
      <div class="barra-acciones" style="margin-bottom: 20px">
        <div class="contenedor-busqueda">
          <i class="fa-solid fa-magnifying-glass icono-busqueda"></i>
          <input
            class="input-busqueda"
            type="text"
            placeholder="Buscar por nombre, licencia o empresa…"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
          />
        </div>
        <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onSearch()">
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="ontrip">En viaje</option>
          <option value="offline">Desconectado</option>
          <option value="inactive">Inactivo</option>
        </select>
        <div class="per-page-control">
          <label class="per-page-label">Por página:</label>
          <select class="filter-select" [(ngModel)]="perPage" (ngModelChange)="onPerPageChange()">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="tabla-contenedor">
        <table class="tabla-resort">
          <thead>
            <tr>
              <th>ID / Usuario</th>
              <th>Licencia</th>
              <th>Pasaporte</th>
              <th>Empresa</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="tabla-vacia">
                  <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                </td>
              </tr>
            } @else if (drivers().length === 0) {
              <tr>
                <td colspan="6" class="tabla-vacia">No hay conductores registrados.</td>
              </tr>
            } @else {
              @for (d of drivers(); track d.idDriver) {
                <tr>
                  <td>
                    <div class="driver-id-cell">
                      <!-- Foto o ícono fallback -->
                      <div class="driver-avatar">
                        @if (d.photoUrl) {
                          <img
                            [src]="d.photoUrl"
                            [alt]="d.user?.name ?? 'Conductor'"
                            class="driver-photo"
                          />
                        } @else {
                          <i class="fa-solid fa-user-tie"></i>
                        }
                      </div>
                      <div>
                        <span class="txt-negrita">
                          {{
                            d.user?.name
                              ? cleanDriverName(d.user!.name)
                              : 'Conductor #' + d.idDriver
                          }}
                        </span>
                        @if (d.user?.email) {
                          <br /><span class="txt-sub">{{ d.user!.email }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td>{{ d.license }}</td>
                  <td>{{ d.passport }}</td>
                  <td>{{ d.company?.businessName ?? '—' }}</td>
                  <td>
                    <span [class]="statusBadgeClass(d.status)">
                      {{ statusLabel(d.status) }}
                    </span>
                  </td>
                  <td>
                    <button
                      class="btn-icon-edit"
                      title="Editar foto del conductor"
                      (click)="openPhotoEdit(d)"
                    >
                      <i class="fa-solid fa-camera"></i>
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="paginacion-estandar">
        <span class="pag-rango">{{ rangeLabel() }}</span>
        <div class="pag-controles">
          <button
            class="btn-pag"
            [disabled]="currentPage() <= 1 || loading()"
            (click)="goPage(1)"
            title="Primera página"
          >
            <i class="fa-solid fa-angles-left"></i>
          </button>
          <button
            class="btn-pag"
            [disabled]="currentPage() <= 1 || loading()"
            (click)="goPage(currentPage() - 1)"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="pag-numeros">
            @for (p of pagesArray(); track $index) {
              @if (p === '...') {
                <span class="pag-ellipsis">...</span>
              } @else {
                <button
                  class="btn-pag-num"
                  [class.active]="p === currentPage()"
                  (click)="goPage($any(p))"
                  [disabled]="loading()"
                >
                  {{ p }}
                </button>
              }
            }
          </div>
          <button
            class="btn-pag"
            [disabled]="currentPage() >= totalPages() || loading()"
            (click)="goPage(currentPage() + 1)"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button
            class="btn-pag"
            [disabled]="currentPage() >= totalPages() || loading()"
            (click)="goPage(totalPages())"
            title="Última página"
          >
            <i class="fa-solid fa-angles-right"></i>
          </button>
        </div>
      </div>

      @if (showLinkForm()) {
        <app-driver-link-form (saved)="onLinkSaved()" (cancelled)="showLinkForm.set(false)" />
      }

      <!-- ===== Modal de edición de foto ===== -->
      @if (editingDriver()) {
        <div class="modal-fondo" (click)="onPhotoModalBackdrop($event)">
          <div class="modal-caja" (click)="$event.stopPropagation()">
            <button class="boton-cerrar" type="button" (click)="closePhotoEdit()">
              <i class="fa-solid fa-xmark"></i>
            </button>

            <h2 class="modal-titulo">
              <i class="fa-solid fa-camera"></i>
              Foto del Conductor
            </h2>

            <p class="modal-subtitle">
              {{ cleanDriverName(editingDriver()!.user?.name) || ('Conductor #' + editingDriver()!.idDriver) }}
            </p>

            <!-- Preview zona -->
            <div class="photo-preview-area">
              @if (photoPreviewUrl()) {
                <img [src]="photoPreviewUrl()!" alt="Preview" class="photo-preview-img" />
              } @else if (editingDriver()!.photoUrl) {
                <img [src]="editingDriver()!.photoUrl!" alt="Foto actual" class="photo-preview-img" />
              } @else {
                <div class="photo-placeholder">
                  <i class="fa-solid fa-user-tie"></i>
                  <span>Sin foto</span>
                </div>
              }
            </div>

            <!-- Drop zone / selector -->
            <label class="drop-zone" for="photoInput">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span>{{ selectedFile() ? selectedFile()!.name : 'Haz clic o arrastra una imagen' }}</span>
              <small>JPG, PNG, WEBP — máx. 2 MB</small>
              <input
                id="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display:none"
                (change)="onFileSelected($event)"
              />
            </label>

            <div class="form-actions" style="margin-top:20px">
              <button type="button" class="btn-cancelar-form" (click)="closePhotoEdit()">
                Cancelar
              </button>
              <button
                type="button"
                class="btn-enviar"
                [disabled]="!selectedFile() || savingPhoto()"
                (click)="savePhoto()"
              >
                @if (savingPhoto()) {
                  <i class="fa-solid fa-spinner fa-spin"></i> Subiendo…
                } @else {
                  <i class="fa-solid fa-floppy-disk"></i> Guardar foto
                }
              </button>
            </div>
          </div>
        </div>
      }
      
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
    /* ---- Foto en tabla ---- */
    .driver-photo {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--color-primary, #6366f1);
    }

    /* ---- Botón ícono editar ---- */
    .btn-icon-edit {
      background: transparent;
      border: 1.5px solid var(--color-primary, #6366f1);
      color: var(--color-primary, #6366f1);
      border-radius: 6px;
      padding: 5px 9px;
      cursor: pointer;
      transition: background 0.18s, color 0.18s;
      font-size: 0.85rem;
    }
    .btn-icon-edit:hover {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }

    /* ---- Modal subtítulo ---- */
    .modal-subtitle {
      text-align: center;
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.9rem;
      margin: -8px 0 18px;
    }

    /* ---- Área preview foto ---- */
    .photo-preview-area {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .photo-preview-img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--color-primary, #6366f1);
      box-shadow: 0 4px 18px rgba(99,102,241,0.25);
    }
    .photo-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: var(--color-surface, #1e293b);
      border: 2px dashed var(--color-border, #334155);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--color-text-secondary, #64748b);
      font-size: 2rem;
    }
    .photo-placeholder span {
      font-size: 0.75rem;
    }

    /* ---- Drop zone ---- */
    .drop-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      border: 2px dashed var(--color-primary, #6366f1);
      border-radius: 10px;
      padding: 20px;
      cursor: pointer;
      color: var(--color-primary, #6366f1);
      transition: background 0.2s;
      font-size: 0.9rem;
    }
    .drop-zone:hover {
      background: rgba(99,102,241,0.08);
    }
    .drop-zone i {
      font-size: 1.8rem;
    }
    .drop-zone small {
      color: var(--color-text-secondary, #64748b);
      font-size: 0.78rem;
    }
  `,
})
export class DriversListComponent implements OnInit {
  private readonly driverService = inject(DriverService);
  private readonly ui = inject(InteractionService);

  drivers = signal<Driver[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 10;
  searchTerm = '';
  statusFilter = '';

  showLinkForm = signal(false);

  // --- Photo edit modal state ---
  editingDriver = signal<Driver | null>(null);
  selectedFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);
  savingPhoto = signal(false);
  imageChangedEvent = signal<any>('');

  rangeLabel = computed(() => {
    const t = this.total();
    if (t === 0) return 'Sin resultados';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, t);
    return `Mostrando ${start}–${end} de ${t}`;
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let p = new HttpParams().set('page', this.currentPage()).set('perPage', this.perPage);
    if (this.searchTerm) p = p.set('search', this.searchTerm);
    if (this.statusFilter) p = p.set('status', this.statusFilter);

    this.driverService.getDrivers(p).subscribe({
      next: (res) => {
        this.drivers.set(res.data ?? []);
        this.total.set(res.meta?.total ?? 0);
        this.totalPages.set(res.meta?.lastPage ?? 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.load();
    this.ui.showToast('Lista actualizada', 'success');
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.load();
    }, 400);
  }

  onPerPageChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  goPage(p: number): void {
    this.currentPage.set(p);
    this.load();
  }

  onLinkSaved(): void {
    this.showLinkForm.set(false);
    this.load();
  }

  // ---- Photo edit modal ----

  openPhotoEdit(driver: Driver): void {
    this.editingDriver.set(driver);
    this.selectedFile.set(null);
    this.photoPreviewUrl.set(null);
  }

  closePhotoEdit(): void {
    this.editingDriver.set(null);
    this.selectedFile.set(null);
    this.photoPreviewUrl.set(null);
    this.imageChangedEvent.set('');
  }

  onPhotoModalBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.closePhotoEdit();
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
    
    const input = document.getElementById('photoInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  cancelCrop(): void {
    this.imageChangedEvent.set('');
    const input = document.getElementById('photoInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  savePhoto(): void {
    const driver = this.editingDriver();
    const file = this.selectedFile();
    if (!driver || !file || this.savingPhoto()) return;

    this.savingPhoto.set(true);
    const payload: DriverUpdatePayload = { photo: file };

    this.driverService.updateDriverWithPhoto(driver.idDriver, payload).subscribe({
      next: (updated) => {
        this.savingPhoto.set(false);
        this.ui.showToast('Foto actualizada correctamente', 'success');

        // Actualizar la foto en la lista local sin recargar toda la tabla
        this.drivers.update((list) =>
          list.map((d) =>
            d.idDriver === driver.idDriver
              ? { ...d, photoUrl: updated.photoUrl ?? d.photoUrl }
              : d
          )
        );
        this.closePhotoEdit();
      },
      error: (err) => {
        this.savingPhoto.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  // ---- Helpers ----

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Disponible',
      ontrip: 'En viaje',
      offline: 'Desconectado',
      inactive: 'Inactivo',
    };
    return map[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      available: 'badge-status badge-available',
      ontrip: 'badge-status badge-ontrip',
      offline: 'badge-status badge-offline',
      inactive: 'badge-status badge-inactive',
    };
    return map[status] ?? 'badge-status badge-offline';
  }

  cleanDriverName(name: string | undefined | null): string {
    if (!name) return '';
    return name.replace(/\s*\(.*?\)\s*$/, '').trim();
  }
}
