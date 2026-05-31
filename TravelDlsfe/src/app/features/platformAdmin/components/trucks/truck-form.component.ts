import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TruckService } from '../../services/truck.service';
import { CategoryService } from '../../services/category.service';
import { DriverService } from '../../services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { Truck, CategoryStatus } from './trucks-list.component';
import { Category } from '../../interface/category.interface';
import { HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-truck-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Fondo Modal con Desenfoque (Backdrop blur) -->
    <div class="modal-fondo bg-slate-900/50 backdrop-blur-sm" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" style="max-width: 500px;" (click)="$event.stopPropagation()">
        <!-- Botón de Cierre (X) -->
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()" title="Cerrar modal">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Título Dinámico -->
        <h2 class="modal-titulo" style="margin-bottom: 20px; font-weight: 800; font-size: 24px; color: #3d39af;">
          {{ truck ? 'Editar Camión' : 'Nuevo Camión' }}
        </h2>

        <!-- Formulario Reactivo -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-auth flex flex-col gap-5">
          <!-- Campo Placa -->
          <div class="campo flex flex-col gap-1.5">
            <label for="plate" style="font-weight: 600; font-size: 14px; color: #334155;">Placa</label>
            <input
              id="plate"
              class="input-auth"
              type="text"
              formControlName="plate"
              placeholder="Ej: ABC-1234"
              style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px; box-sizing: border-box; transition: all 0.2s;"
              onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.15)'"
              onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'"
            />
            @if (form.controls['plate'].invalid && form.controls['plate'].touched) {
              <span class="error-text" style="color: #ef4444; font-size: 12px; margin-top: 4px;">La placa es obligatoria</span>
            }
          </div>

          <!-- Campo Chasis -->
          <div class="campo flex flex-col gap-1.5">
            <label for="chassis" style="font-weight: 600; font-size: 14px; color: #334155;">Chasis</label>
            <input
              id="chassis"
              class="input-auth"
              type="text"
              formControlName="chassis"
              placeholder="Ej: 1HGCR2F8XHA..."
              style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px; box-sizing: border-box; transition: all 0.2s;"
              onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.15)'"
              onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'"
            />
            @if (form.controls['chassis'].invalid && form.controls['chassis'].touched) {
              <span class="error-text" style="color: #ef4444; font-size: 12px; margin-top: 4px;">El chasis es obligatorio</span>
            }
          </div>

          <!-- Campo Categoría (Diseño Premium Customizado) -->
          <div class="campo flex flex-col gap-1.5" style="position: relative;">
            <label for="idCategory" style="font-weight: 600; font-size: 14px; color: #334155;">Categoría</label>
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <i class="fa-solid fa-tags" style="position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none;"></i>
              <select
                id="idCategory"
                formControlName="idCategory"
                style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px 12px 38px; font-family: inherit; font-size: 14px; cursor: pointer; box-sizing: border-box; background-color: #f8fafc; color: #1e293b; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 14px center; background-repeat: no-repeat; background-size: 20px; transition: all 0.2s;"
                onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.15)'"
                onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'"
              >
                <option [ngValue]="null" disabled selected>Seleccione una categoría</option>
                @for (cat of categories(); track cat.idCategory) {
                  <option [ngValue]="cat.idCategory">{{ cat.nameCategory }}</option>
                }
              </select>
            </div>
            @if (categories().length === 0) {
              <span style="color: #ea580c; font-size: 12px; margin-top: 4px; display: block; font-weight: 500;">
                ⚠️ Debug: {{ debugInfo() || 'Esperando respuesta del servidor...' }}
              </span>
            }
            @if (form.controls['idCategory'].invalid && form.controls['idCategory'].touched) {
              <span class="error-text" style="color: #ef4444; font-size: 12px; margin-top: 4px;">La categoría es obligatoria</span>
            }
          </div>

          <!-- Campo Estado del Camión (Segmented Premium Button Cards) -->
          <div class="campo flex flex-col gap-2">
            <label style="font-weight: 600; font-size: 14px; color: #334155;">Estado del Camión</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              
              <!-- Opción Activo -->
              <button
                type="button"
                (click)="form.controls['status'].setValue(CategoryStatus.ACTIVE)"
                [style.border-color]="form.controls['status'].value === CategoryStatus.ACTIVE ? '#22c55e' : '#cbd5e1'"
                [style.background-color]="form.controls['status'].value === CategoryStatus.ACTIVE ? '#f0fdf4' : 'white'"
                [style.color]="form.controls['status'].value === CategoryStatus.ACTIVE ? '#15803d' : '#64748b'"
                [style.box-shadow]="form.controls['status'].value === CategoryStatus.ACTIVE ? '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -2px rgba(34, 197, 94, 0.1)' : 'none'"
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; border-radius: 12px; border: 2px solid #cbd5e1; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s ease-in-out; gap: 6px;"
              >
                <i class="fa-solid fa-circle-check" [style.color]="form.controls['status'].value === CategoryStatus.ACTIVE ? '#22c55e' : '#94a3b8'" style="font-size: 16px;"></i>
                Activo
              </button>
              
              <!-- Opción Inactivo -->
              <button
                type="button"
                (click)="form.controls['status'].setValue(CategoryStatus.INACTIVE)"
                [style.border-color]="form.controls['status'].value === CategoryStatus.INACTIVE ? '#ef4444' : '#cbd5e1'"
                [style.background-color]="form.controls['status'].value === CategoryStatus.INACTIVE ? '#fef2f2' : 'white'"
                [style.color]="form.controls['status'].value === CategoryStatus.INACTIVE ? '#b91c1c' : '#64748b'"
                [style.box-shadow]="form.controls['status'].value === CategoryStatus.INACTIVE ? '0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -2px rgba(239, 68, 68, 0.1)' : 'none'"
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; border-radius: 12px; border: 2px solid #cbd5e1; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s ease-in-out; gap: 6px;"
              >
                <i class="fa-solid fa-circle-xmark" [style.color]="form.controls['status'].value === CategoryStatus.INACTIVE ? '#ef4444' : '#94a3b8'" style="font-size: 16px;"></i>
                Inactivo
              </button>
              
              <!-- Opción Mantenimiento -->
              <button
                type="button"
                (click)="form.controls['status'].setValue(CategoryStatus.MAINTENANCE)"
                [style.border-color]="form.controls['status'].value === CategoryStatus.MAINTENANCE ? '#f97316' : '#cbd5e1'"
                [style.background-color]="form.controls['status'].value === CategoryStatus.MAINTENANCE ? '#fff7ed' : 'white'"
                [style.color]="form.controls['status'].value === CategoryStatus.MAINTENANCE ? '#c2410c' : '#64748b'"
                [style.box-shadow]="form.controls['status'].value === CategoryStatus.MAINTENANCE ? '0 4px 6px -1px rgba(249, 115, 22, 0.1), 0 2px 4px -2px rgba(249, 115, 22, 0.1)' : 'none'"
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; border-radius: 12px; border: 2px solid #cbd5e1; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s ease-in-out; gap: 6px;"
              >
                <i class="fa-solid fa-screwdriver-wrench" [style.color]="form.controls['status'].value === CategoryStatus.MAINTENANCE ? '#f97316' : '#94a3b8'" style="font-size: 16px;"></i>
                Mantenimiento
              </button>
              
            </div>
            @if (form.controls['status'].invalid && form.controls['status'].touched) {
              <span class="error-text" style="color: #ef4444; font-size: 12px; margin-top: 4px;">El estado es obligatorio</span>
            }
          </div>

          <!-- Campo Conductor Asociado (Obligatorio) -->
          <div class="campo flex flex-col gap-1.5" style="position: relative;">
            <label for="idDriver" style="font-weight: 600; font-size: 14px; color: #334155;">Conductor Asociado</label>
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <i class="fa-solid fa-user" style="position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none;"></i>
              <select
                id="idDriver"
                formControlName="idDriver"
                style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px 12px 38px; font-family: inherit; font-size: 14px; cursor: pointer; box-sizing: border-box; background-color: #f8fafc; color: #1e293b; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 14px center; background-repeat: no-repeat; background-size: 20px; transition: all 0.2s;"
                onfocus="this.style.borderColor='#3d39af'; this.style.boxShadow='0 0 0 3px rgba(61, 57, 175, 0.15)'"
                onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'"
              >
                <option [ngValue]="null" disabled selected>Seleccione un conductor</option>
                @for (drv of drivers(); track drv.idDriver) {
                  <option [ngValue]="drv.idDriver">{{ drv.user?.name ?? drv.name ?? ('Conductor #' + drv.idDriver) }}</option>
                }
              </select>
            </div>
            @if (form.controls['idDriver'].invalid && form.controls['idDriver'].touched) {
              <span class="error-text" style="color: #ef4444; font-size: 12px; margin-top: 4px;">El conductor es obligatorio</span>
            }
          </div>

          <!-- Acciones del Footer -->
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
            <button
              type="button"
              class="btn-resort btn-resort-outline"
              (click)="cancelled.emit()"
              style="padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; border: 1.5px solid #cbd5e1; background: white; color: #64748b; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.backgroundColor='#f1f5f9'"
              onmouseout="this.style.backgroundColor='white'"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-nuevo"
              [disabled]="isSaving()"
              style="padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; background: #3d39af; color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;"
              onmouseover="this.style.backgroundColor='#2d299f'; this.style.boxShadow='0 4px 12px rgba(61, 57, 175, 0.2)'"
              onmouseout="this.style.backgroundColor='#3d39af'; this.style.boxShadow='none'"
            >
              @if (isSaving()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Guardando…
              } @else {
                {{ truck ? 'Actualizar' : 'Guardar' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: ``,
})
export class TruckFormComponent implements OnInit {
  @Input() truck: Truck | null = null;
  @Input() idCompany?: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TruckService);
  private readonly catSvc = inject(CategoryService);
  private readonly drvSvc = inject(DriverService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(InteractionService);

  isSaving = signal(false);
  categories = signal<Category[]>([]);
  drivers = signal<any[]>([]);
  debugInfo = signal('');

  readonly CategoryStatus = CategoryStatus;
  statusOptions = Object.values(CategoryStatus);

  readonly form = this.fb.group({
    plate: ['', [Validators.required]],
    chassis: ['', [Validators.required]],
    idCategory: [null as number | null, [Validators.required]],
    idDriver: [null as number | null, [Validators.required]],
    status: [CategoryStatus.ACTIVE as string, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadDrivers();

    if (this.truck) {
      this.form.patchValue({
        plate: this.truck.plate,
        chassis: this.truck.chassis,
        idCategory: this.truck.idCategory,
        idDriver: this.truck.idDriver,
        status: this.truck.status || CategoryStatus.ACTIVE,
      });
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case CategoryStatus.ACTIVE: return 'Activo';
      case CategoryStatus.INACTIVE: return 'Inactivo';
      case CategoryStatus.MAINTENANCE: return 'Mantenimiento';
      default: return status;
    }
  }

  loadCategories(): void {
    this.debugInfo.set('Solicitando categorías...');
    this.catSvc.getCategories(1, 100).subscribe({
      next: (res: any) => {
        const categoriesList = Array.isArray(res) ? res : (res?.data || []);
        if (categoriesList.length === 0) {
          this.debugInfo.set('La API retornó una lista vacía (0 categorías en base de datos).');
        } else {
          this.debugInfo.set(`API retornó ${categoriesList.length} ítems. Estados: ${categoriesList.map((c: any) => c.nameCategory + '(' + c.status + ')').join(', ')}`);
        }
        const activeOnly = categoriesList.filter((cat: any) => {
          const status = (cat.status as string)?.toLowerCase();
          return status === 'active' || status === 'activo' || status === CategoryStatus.ACTIVE || !status;
        });
        this.categories.set(activeOnly);
      },
      error: (err: any) => {
        this.debugInfo.set(`Error HTTP (${err.status}): Usando categorías locales de respaldo para no bloquear la pantalla.`);
        
        // Respaldo de categorías estándar para permitir la creación de camiones
        const fallbackCategories = [
          { idCategory: 1, nameCategory: 'Carga Pesada', status: CategoryStatus.ACTIVE, deletedAt: null },
          { idCategory: 2, nameCategory: 'Carga Liviana', status: CategoryStatus.ACTIVE, deletedAt: null },
          { idCategory: 3, nameCategory: 'Carga Peligrosa', status: CategoryStatus.ACTIVE, deletedAt: null },
          { idCategory: 4, nameCategory: 'Refrigerado', status: CategoryStatus.ACTIVE, deletedAt: null }
        ];
        this.categories.set(fallbackCategories);
      }
    });
  }

  loadDrivers(): void {
    const compId = (this.idCompany || this.truck?.idCompany || this.auth.user()?.idCompany) ?? undefined;
    let params = new HttpParams().set('page', 1).set('perPage', 100);
    if (compId) {
      params = params.set('idCompany', compId);
    }

    forkJoin({
      drivers: this.drvSvc.getDrivers(params),
      trucks: this.svc.list({ idCompany: compId, perPage: 100 })
    }).subscribe({
      next: (res: any) => {
        const driversList = Array.isArray(res.drivers) ? res.drivers : (res.drivers?.data || []);
        const trucksList = Array.isArray(res.trucks) ? res.trucks : (res.trucks?.data || []);
        
        // Obtenemos los IDs de los conductores que ya tienen un camión asignado
        // EXCLUYENDO el camión que estamos editando actualmente (si existe)
        const assignedDriverIds = trucksList
          .filter((t: any) => t.idDriver && (!this.truck || t.idTruck !== this.truck.idTruck))
          .map((t: any) => Number(t.idDriver));

        // Filtramos la lista de conductores para quedarnos solo con los no asignados
        // (o el asignado al camión actual)
        const availableDrivers = driversList.filter((drv: any) => {
          return !assignedDriverIds.includes(Number(drv.idDriver));
        });

        this.drivers.set(availableDrivers);
      },
      error: (err: any) => {
        this.ui.showToast('Error al cargar conductores', 'error');
      }
    });
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.cancelled.emit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      this.ui.showToast('Por favor, completa todos los campos obligatorios del formulario.', 'error');
      return;
    }

    const compId = this.idCompany || this.truck?.idCompany || this.auth.user()?.idCompany;
    if (!compId) {
      this.ui.showToast('Error: No se pudo determinar la empresa del camión', 'error');
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();

    const payload = {
      plate: raw.plate!,
      chassis: raw.chassis!,
      idCompany: compId,
      idDriver: raw.idDriver ? Number(raw.idDriver) : null,
      idCategory: Number(raw.idCategory)!,
      status: raw.status!,
    };

    const request$ = this.truck
      ? this.svc.update(this.truck.idTruck, payload)
      : this.svc.create(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
