import { Component, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { DriverService } from '../../services/driver.service';
import { UserService } from '../../services/user.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { Company } from '../../interface/company.interface';

interface DriverUserOption {
  idUser: number;
  idDriver: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-driver-link-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-fondo" (click)="onBackdrop($event)">
      <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
        <button class="boton-cerrar" type="button" (click)="cancelled.emit()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h2 class="modal-titulo">Vincular Conductor a Empresa</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Seleccionar Conductor -->
          <div class="campo">
            <label for="idDriver">
              Conductor (Sin asignar) <span class="req-mark">*</span>
            </label>

            @if (loadingDrivers()) {
              <div class="users-loading">
                <i class="fa-solid fa-spinner fa-spin"></i> Cargando conductores…
              </div>
            } @else if (drivers().length === 0) {
              <div class="users-empty">
                <i class="fa-solid fa-circle-exclamation"></i>
                No hay conductores sin empresa asignada.
              </div>
            } @else {
              <select id="idDriver" class="input-auth" formControlName="idDriver">
                <option [ngValue]="null" disabled selected hidden>Seleccionar conductor…</option>
                @for (d of drivers(); track d.idDriver) {
                  <option [value]="d.idDriver">{{ d.name }} — {{ d.email }}</option>
                }
              </select>
            }

            @if (form.controls['idDriver'].invalid && form.controls['idDriver'].touched) {
              <span class="error-text">Debes seleccionar un conductor</span>
            }
          </div>

          <!-- Seleccionar Empresa -->
          <div class="campo">
            <label for="idCompany">
              Empresa <span class="req-mark">*</span>
            </label>

            @if (loadingCompanies()) {
              <div class="users-loading">
                <i class="fa-solid fa-spinner fa-spin"></i> Cargando empresas…
              </div>
            } @else if (companies().length === 0) {
              <div class="users-empty">
                <i class="fa-solid fa-circle-exclamation"></i>
                No hay empresas registradas.
              </div>
            } @else {
              <select id="idCompany" class="input-auth" formControlName="idCompany">
                <option [ngValue]="null" disabled selected hidden>Seleccionar empresa…</option>
                @for (c of companies(); track c.idCompany) {
                  <option [value]="c.idCompany">{{ c.businessName }} ({{ c.ruc }})</option>
                }
              </select>
            }

            @if (form.controls['idCompany'].invalid && form.controls['idCompany'].touched) {
              <span class="error-text">Debes seleccionar una empresa</span>
            }
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancelar-form" (click)="cancelled.emit()">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-enviar"
              [disabled]="form.invalid || saving() || loadingDrivers() || loadingCompanies()"
            >
              @if (saving()) {
                <i class="fa-solid fa-spinner fa-spin"></i> Vinculando…
              } @else {
                <i class="fa-solid fa-link"></i> Vincular
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: ``,
})
export class DriverLinkFormComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly companyService = inject(CompanyService);
  private readonly driverService = inject(DriverService);
  private readonly ui = inject(InteractionService);

  saving = signal(false);
  
  drivers = signal<DriverUserOption[]>([]);
  loadingDrivers = signal(false);

  companies = signal<Company[]>([]);
  loadingCompanies = signal(false);

  readonly form = this.fb.group({
    idDriver: [null as number | null, Validators.required],
    idCompany: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.loadDrivers();
    this.loadCompanies();
  }

  loadDrivers(): void {
    this.loadingDrivers.set(true);
    // Fetch unassigned drivers
    this.userService.getUnassignedDriverUsers().subscribe({
      next: (users: any[]) => {
        // Map the backend response
        this.drivers.set(users);
        this.loadingDrivers.set(false);
      },
      error: () => {
        this.loadingDrivers.set(false);
        this.ui.showToast('No se pudieron cargar los conductores sin asignar', 'error');
      },
    });
  }

  loadCompanies(): void {
    this.loadingCompanies.set(true);
    // Fetch companies (we fetch up to 100 for the dropdown)
    this.companyService.list({ page: 1, perPage: 100 }).subscribe({
      next: (res) => {
        this.companies.set(res.data ?? []);
        this.loadingCompanies.set(false);
      },
      error: () => {
        this.loadingCompanies.set(false);
        this.ui.showToast('No se pudieron cargar las empresas', 'error');
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

    const payload = {
      idCompany: Number(raw.idCompany),
    };

    this.driverService.updateDriver(Number(raw.idDriver), payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.ui.showToast('Conductor vinculado exitosamente', 'success');
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }
}
