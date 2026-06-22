import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap, tap } from 'rxjs';
import {
  CompanyDriverService,
  DRIVER_ROLE_ID,
  Driver,
  UnassignedDriver,
} from '../../services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../platformAdmin/services/company.service';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import {
  driverDisplayName as formatDriverDisplayName,
  stripLicenseFromDisplayName,
} from '../../../../shared/utils/driver-display.util';

const PENDING_NAMES_STORAGE_KEY = 'TravelDLS_company_pending_driver_names';
const PENDING_USER_LINK_PREFIX = 'TravelDLS_driver_user_link_';

type PendingNamesByCompany = Record<string, Record<string, string>>;

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <i class="fa-solid fa-id-card" style="color: #3d39af; margin-right: 8px;"></i>
            Mis Conductores
          </h1>
          <p class="page-sub">
            {{ total() }} conductores con cuenta activa
            @if (pendingDrivers().length > 0) {
              · {{ pendingDrivers().length }} pendiente(s) de acceso
            }
          </p>
        </div>
        <div class="header-actions">
          <button
            class="btn-refresh"
            [class.spinning]="loading()"
            (click)="refreshAll()"
            title="Actualizar lista"
            type="button"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="btn-nuevo" type="button" (click)="openProfileModal()">
            <i class="fa-solid fa-plus"></i> Nuevo Conductor
          </button>
        </div>
      </div>

      @if (pendingDrivers().length > 0) {
        <section class="pending-drivers-banner" aria-label="Conductores pendientes de cuenta">
          <div class="pending-drivers-header">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <h2 class="pending-drivers-title">Cuentas de acceso pendientes</h2>
              <p class="pending-drivers-sub">
                Estos conductores ya tienen perfil operativo pero aún no pueden iniciar sesión.
                Completa el Paso 2 para vincular su cuenta.
              </p>
            </div>
          </div>
          <div class="pending-drivers-grid">
            @for (pd of pendingDrivers(); track pd.idDriver) {
              <article class="pending-driver-card">
                <p class="pending-driver-name">{{ pendingDisplayName(pd) }}</p>
                <p class="pending-driver-meta">
                  Licencia: {{ pd.license }} · Pasaporte: {{ pd.passport }}
                </p>
                <button type="button" class="btn-crear-cuenta" (click)="openAccountModal(pd)">
                  <i class="fa-solid fa-user-plus"></i> Crear Cuenta
                </button>
              </article>
            }
          </div>
        </section>
      }

      <div class="company-content-card">
        <div class="company-toolbar" style="margin-bottom: 20px;">
          <div class="company-search-box" style="flex: 1; max-width: 700px;">
            <i class="fa-solid fa-magnifying-glass company-search-icon"></i>
            <input
              class="company-search-input"
              type="text"
              placeholder="Buscar conductor…"
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

        <div class="tabla-contenedor" style="border-radius: 0; border: none; box-shadow: none;">
          <table class="tabla-resort">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Licencia</th>
                <th>Pasaporte</th>
                <th>Estado</th>
                <th class="txt-centro">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="5" class="tabla-vacia">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando…
                  </td>
                </tr>
              } @else if (drivers().length === 0) {
                <tr>
                  <td colspan="5">
                    <div class="empty-state-company">
                      <div class="empty-state-icon"><i class="fa-solid fa-user-group"></i></div>
                      <p class="empty-state-text">
                        No hay conductores con cuenta activa en tu empresa
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (d of drivers(); track d.idDriver) {
                  <tr>
                    <td>
                      <div class="driver-id-cell">
                        <div class="driver-avatar"><i class="fa-solid fa-user-tie"></i></div>
                        <div>
                          <span class="txt-negrita">{{ driverDisplayName(d) }}</span>
                          @if (d.user?.email) {
                            <br /><span class="txt-sub">{{ d.user!.email }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>{{ d.license }}</td>
                    <td>{{ d.passport }}</td>
                    <td>
                      <span [class]="statusBadgeClass(d.status)">{{ statusLabel(d.status) }}</span>
                    </td>
                    <td class="txt-centro">
                      <div class="acciones-celda">
                        <button
                          class="btn-accion btn-editar"
                          title="Editar perfil"
                          type="button"
                          (click)="openEditModal(d)"
                        >
                          <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button
                          class="btn-accion btn-eliminar"
                          title="Eliminar conductor"
                          type="button"
                          (click)="onDeleteDriver(d)"
                        >
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="paginacion-estandar" style="padding: 16px 0; margin-top: 10px;">
          <span class="pag-rango">{{ rangeLabel() }}</span>
          <div class="pag-controles">
            <button
              class="btn-pag"
              type="button"
              [disabled]="currentPage() <= 1 || loading()"
              (click)="goPage(1)"
            >
              <i class="fa-solid fa-angles-left"></i>
            </button>
            <button
              class="btn-pag"
              type="button"
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
                    type="button"
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
              type="button"
              [disabled]="currentPage() >= totalPages() || loading()"
              (click)="goPage(currentPage() + 1)"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button
              class="btn-pag"
              type="button"
              [disabled]="currentPage() >= totalPages() || loading()"
              (click)="goPage(totalPages())"
            >
              <i class="fa-solid fa-angles-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Paso 1: Perfil operativo -->
    @if (showProfileModal()) {
      <div class="modal-fondo" (click)="onProfileBackdrop($event)">
        <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
          <button class="boton-cerrar" type="button" (click)="closeProfileModal()" title="Cerrar">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <h2 class="modal-titulo">Paso 1 — Perfil del conductor</h2>
          <p class="page-sub" style="margin: 0 0 20px;">
            Registra nombre, licencia y pasaporte. La cuenta de acceso se crea en el siguiente paso.
          </p>

          <form (ngSubmit)="onSubmitProfile()" class="form-auth">
            <div class="campo">
              <label>Nombre completo <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="profileForm.name"
                name="profileName"
                placeholder="Ej: Juan Pérez García"
                required
              />
            </div>
            <div class="campo">
              <label>Número de licencia <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="profileForm.license"
                name="profileLicense"
                placeholder="Ej: LIC-98765"
                required
              />
            </div>
            <div class="campo">
              <label>Pasaporte<span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="profileForm.passport"
                name="profilePassport"
                placeholder="Ej: PAS-12345"
                required
              />
            </div>
            <div class="campo">
              <label>Compañía operativa</label>
              <input
                class="input-auth"
                type="text"
                [value]="companyBusinessName()"
                readonly
                disabled
              />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancelar-form" (click)="closeProfileModal()">
                Cancelar
              </button>
              <button
                type="submit"
                class="btn-enviar"
                [disabled]="isSaving() || !isProfileFormValid()"
              >
                @if (isSaving()) {
                  <i class="fa-solid fa-spinner fa-spin"></i> Guardando…
                } @else {
                  <i class="fa-solid fa-id-card"></i> Crear perfil
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Paso 2: Cuenta de acceso -->
    @if (showAccountModal()) {
      <div class="modal-fondo" (click)="onAccountBackdrop($event)">
        <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
          <button class="boton-cerrar" type="button" (click)="closeAccountModal()" title="Cerrar">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <h2 class="modal-titulo">
            Crear Cuenta de Acceso para: {{ pendingDisplayName(selectedDriver()!) }}
          </h2>
          <form (ngSubmit)="onSubmitAccount()" class="form-auth">
            <div class="campo">
              <label>Nombre completo <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="accountForm.name"
                name="accountName"
                required
              />
            </div>
            <div class="campo">
              <label>Correo electrónico <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="email"
                [(ngModel)]="accountForm.email"
                name="accountEmail"
                placeholder="conductor@empresa.com"
                required
              />
            </div>
            <div class="campo">
              <label>Contraseña temporal <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="password"
                [(ngModel)]="accountForm.password"
                name="accountPassword"
                placeholder="Mínimo 8 caracteres"
                minlength="8"
                required
              />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancelar-form" (click)="closeAccountModal()">
                Cancelar
              </button>
              <button
                type="submit"
                class="btn-enviar"
                [disabled]="isSaving() || !isAccountFormValid()"
              >
                @if (isSaving()) {
                  <i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta…
                } @else {
                  <i class="fa-solid fa-user-check"></i> Crear cuenta
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Edición de perfil (conductores con cuenta) -->
    @if (showEditModal()) {
      <div class="modal-fondo" (click)="onEditBackdrop($event)">
        <div class="modal-caja modal-wider" (click)="$event.stopPropagation()">
          <button class="boton-cerrar" type="button" (click)="closeEditModal()" title="Cerrar">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <h2 class="modal-titulo">Editar perfil del conductor</h2>
          <p class="page-sub" style="margin: 0 0 20px;">
            Las credenciales de acceso no se modifican desde aquí.
          </p>

          <form (ngSubmit)="onSubmitEdit()" class="form-auth">
            <div class="campo">
              <label>Nombre completo</label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="editForm.name"
                name="editName"
                readonly
                disabled
              />
            </div>
            <div class="campo">
              <label>Correo electrónico</label>
              <input
                class="input-auth"
                type="email"
                [(ngModel)]="editForm.email"
                name="editEmail"
                readonly
                disabled
              />
            </div>
            <div class="campo">
              <label>Número de licencia <span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="editForm.license"
                name="editLicense"
                required
              />
            </div>
            <div class="campo">
              <label>Pasaporte<span class="req-mark">*</span></label>
              <input
                class="input-auth"
                type="text"
                [(ngModel)]="editForm.passport"
                name="editPassport"
                required
              />
            </div>
            <div class="campo">
              <label>Compañía operativa</label>
              <input
                class="input-auth"
                type="text"
                [value]="companyBusinessName()"
                readonly
                disabled
              />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancelar-form" (click)="closeEditModal()">
                Cancelar
              </button>
              <button
                type="submit"
                class="btn-enviar"
                [disabled]="isSaving() || !isEditFormValid()"
              >
                @if (isSaving()) {
                  <i class="fa-solid fa-spinner fa-spin"></i> Guardando…
                } @else {
                  <i class="fa-solid fa-pen"></i> Editar perfil
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: `
    .input-auth:disabled {
      background-color: #f1f5f9 !important;
      cursor: not-allowed;
      border-color: #e2e8f0;
      color: #64748b;
    }
  `,
})
export class DriversListComponent implements OnInit {
  private readonly driverService = inject(CompanyDriverService);
  private readonly auth = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  readonly drivers = signal<Driver[]>([]);
  readonly pendingDrivers = signal<UnassignedDriver[]>([]);
  readonly loading = signal(true);
  readonly isSaving = signal(false);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);

  readonly showProfileModal = signal(false);
  readonly showAccountModal = signal(false);
  readonly showEditModal = signal(false);
  readonly selectedDriver = signal<UnassignedDriver | null>(null);
  readonly selectedActiveDriver = signal<Driver | null>(null);

  profileForm = { name: '', license: '', passport: '' };
  accountForm = { name: '', email: '', password: '' };
  editForm = { name: '', email: '', license: '', passport: '' };

  searchTerm = '';
  statusFilter = '';
  perPage = 10;
  companyId: number | null = null;
  readonly companyBusinessName = signal('');
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly rangeLabel = computed(() => {
    if (this.total() === 0) return 'Mostrando 0 - 0 de 0 conductores';
    const start = (this.currentPage() - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage() * this.perPage, this.total());
    return `Mostrando ${start} - ${end} de ${this.total()} conductores`;
  });

  readonly pagesArray = computed(() => {
    const current = this.currentPage();
    const last = this.totalPages();
    const delta = 2;
    const left = current - delta;
    const right = current + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || (i >= left && i < right)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  });

  ngOnInit(): void {
    void this.initWithSession();
  }

  private async initWithSession(): Promise<void> {
    if (!this.auth.user()) {
      try {
        await firstValueFrom(this.auth.refreshSession());
      } catch {
        this.loading.set(false);
        return;
      }
    }

    const user = this.auth.user();
    if (user?.role?.toLowerCase() !== 'company' || !user.idCompany) {
      this.loading.set(false);
      this.ui.showToast(
        'Inicia sesión con una cuenta de empresa para gestionar conductores.',
        'error',
      );
      return;
    }

    this.companyId = user.idCompany;
    this.loadCompanyName(user.idCompany, user.name);
    this.refreshAll();
  }

  private loadCompanyName(idCompany: number, fallbackUserName?: string): void {
    this.companyService.getById(idCompany).subscribe({
      next: (c: unknown) => {
        const data = c as Record<string, unknown>;
        const nested = (data['data'] ?? data['company'] ?? data) as Record<string, unknown>;
        const name =
          (nested['businessName'] as string) ||
          (nested['business_name'] as string) ||
          fallbackUserName ||
          `Empresa #${idCompany}`;
        this.companyBusinessName.set(name);
      },
      error: () => {
        this.companyBusinessName.set(fallbackUserName || `Empresa #${idCompany}`);
      },
    });
  }

  driverDisplayName(d: Driver): string {
    return formatDriverDisplayName(d.user?.name, d.name, d.license, d.idDriver);
  }

  pendingDisplayName(pd: UnassignedDriver): string {
    return pd.name?.trim() || this.getStoredPendingName(pd.idDriver) || `Conductor #${pd.idDriver}`;
  }

  load(): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.driverService.getDrivers(this.buildListParams()).subscribe({
      next: (res) => {
        this.drivers.set((res.data ?? []).filter((d) => !!d.user));
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

  loadPendingDrivers(): void {
    if (!this.companyId) return;
    this.fetchPendingDrivers$().subscribe({
      next: (list) => {
        this.pendingDrivers.set(this.enrichPendingDrivers(list));
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  /**
   * Usa GET /api/drivers (permiso company) y filtra sin user en cliente.
   * Evita 403 de /api/users/drivers-without-user si la sesión no es rol company en API.
   */
  private fetchPendingDrivers$(): Observable<UnassignedDriver[]> {
    const p = new HttpParams()
      .set('idCompany', String(this.companyId))
      .set('page', '1')
      .set('perPage', '100');

    return this.driverService.getDrivers(p).pipe(
      map((res) =>
        (res.data ?? [])
          .filter((d) => !d.user)
          .map((d) => ({
            idDriver: d.idDriver,
            license: d.license,
            passport: d.passport,
            status: d.status,
            photoUrl: d.photoUrl,
            deletedAt: d.deletedAt,
            idCompany: this.companyId!,
          })),
      ),
    );
  }

  refreshAll(): void {
    this.load();
    this.loadPendingDrivers();
  }

  private refreshAfterMutation(): void {
    forkJoin({
      list: this.driverService.getDrivers(this.buildListParams()),
      pending: this.fetchPendingDrivers$(),
    }).subscribe({
      next: ({ list, pending }) => {
        this.drivers.set((list.data ?? []).filter((d) => !!d.user));
        this.total.set(list.meta?.total ?? 0);
        this.totalPages.set(list.meta?.lastPage ?? 1);
        this.pendingDrivers.set(this.enrichPendingDrivers(pending));
        this.loading.set(false);
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.loading.set(false);
      },
    });
  }

  private buildListParams(): HttpParams {
    let p = new HttpParams().set('page', this.currentPage()).set('perPage', String(this.perPage));
    if (this.searchTerm.trim()) p = p.set('search', this.searchTerm.trim());
    if (this.statusFilter) p = p.set('status', this.statusFilter);
    if (this.companyId) p = p.set('idCompany', this.companyId);
    return p;
  }

  private enrichPendingDrivers(list: UnassignedDriver[]): UnassignedDriver[] {
    return list.map((d) => ({
      ...d,
      name: this.getStoredPendingName(d.idDriver) ?? d.name,
    }));
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
    if (p >= 1 && p <= this.totalPages() && p !== this.currentPage()) {
      this.currentPage.set(p);
      this.load();
    }
  }

  openProfileModal(): void {
    this.profileForm = { name: '', license: '', passport: '' };
    this.showProfileModal.set(true);
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }

  onProfileBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.closeProfileModal();
    }
  }

  isProfileFormValid(): boolean {
    return (
      this.profileForm.name.trim().length >= 2 &&
      this.profileForm.license.trim().length >= 5 &&
      this.profileForm.passport.trim().length >= 5
    );
  }

  onSubmitProfile(): void {
    if (!this.companyId || !this.isProfileFormValid() || this.isSaving()) return;

    this.isSaving.set(true);
    const payload = {
      idCompany: this.companyId,
      license: this.profileForm.license.trim(),
      passport: this.profileForm.passport.trim(),
    };

    this.driverService.createDriver(payload).subscribe({
      next: (created) => {
        this.savePendingName(created.idDriver, this.profileForm.name.trim());
        this.ui.showToast(
          'Perfil operativo registrado. Crea la cuenta de acceso cuando estés listo.',
          'success',
        );
        this.isSaving.set(false);
        this.closeProfileModal();
        this.refreshAfterMutation();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.isSaving.set(false);
      },
    });
  }

  openAccountModal(pd: UnassignedDriver): void {
    const displayName = this.pendingDisplayName(pd);
    this.selectedDriver.set({ ...pd, name: displayName });
    this.accountForm = {
      name: displayName,
      email: '',
      password: '',
    };
    this.showAccountModal.set(true);
  }

  closeAccountModal(): void {
    this.showAccountModal.set(false);
    this.selectedDriver.set(null);
  }

  onAccountBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.closeAccountModal();
    }
  }

  isAccountFormValid(): boolean {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.accountForm.email.trim());
    return (
      emailOk && this.accountForm.password.length >= 8 && this.accountForm.name.trim().length >= 2
    );
  }

  onSubmitAccount(): void {
    const pd = this.selectedDriver();
    if (!pd || !this.isAccountFormValid() || this.isSaving()) return;
    this.registerAndLinkDriver(pd);
  }

  /** Nombre único para tabla users (name tiene índice UNIQUE global). */
  private buildAccountUserName(displayName: string, license: string): string {
    return displayName.trim();
  }

  private registerAndLinkDriver(pd: UnassignedDriver): void {
    this.isSaving.set(true);
    const registerPayload = {
      name: this.buildAccountUserName(this.accountForm.name.trim(), pd.license),
      email: this.accountForm.email.trim().toLowerCase(),
      password: this.accountForm.password,
      roleId: DRIVER_ROLE_ID,
    };

    this.driverService
      .registerUser(registerPayload)
      .pipe(
        tap((res) => {
          if (res.user?.idUser) {
            this.savePendingUserLink(pd.idDriver, res.user.idUser);
          }
        }),
        switchMap((res) => {
          const idUser = res.user?.idUser;
          if (!idUser) {
            throw new Error('El servidor no devolvió el identificador del usuario.');
          }
          return this.driverService.updateDriver(pd.idDriver, { userId: idUser });
        }),
      )
      .subscribe({
        next: () => this.onAccountLinkSuccess(pd),
        error: (err) => this.handleAccountCreationError(err, pd),
      });
  }

  private linkDriverToExistingUser(pd: UnassignedDriver, idUser: number): void {
    this.isSaving.set(true);
    this.driverService.updateDriver(pd.idDriver, { userId: idUser }).subscribe({
      next: () => this.onAccountLinkSuccess(pd),
      error: (err) => {
        this.isSaving.set(false);
        this.ui.showToast(getHttpErrorMessage(err), 'error');
      },
    });
  }

  private onAccountLinkSuccess(pd: UnassignedDriver): void {
    this.clearPendingUserLink(pd.idDriver);
    this.removePendingName(pd.idDriver);
    this.ui.showToast('Cuenta creada y vinculada correctamente.', 'success');
    this.isSaving.set(false);
    this.closeAccountModal();
    this.refreshAfterMutation();
  }

  private handleAccountCreationError(err: unknown, pd: UnassignedDriver): void {
    const raw = getHttpErrorMessage(err);
    const isDuplicate = /already exists|ya existe/i.test(raw);
    const cachedUserId = this.getPendingUserLink(pd.idDriver);

    if (isDuplicate && cachedUserId) {
      this.ui.showToast(
        'La cuenta ya existía; completando la vinculación con el conductor…',
        'success',
      );
      this.linkDriverToExistingUser(pd, cachedUserId);
      return;
    }

    this.isSaving.set(false);
    this.ui.showToast(this.mapRegisterErrorMessage(raw), 'error');
  }

  private mapRegisterErrorMessage(raw: string): string {
    if (/already exists|ya existe/i.test(raw)) {
      return (
        'Ese correo o nombre de usuario ya está registrado en TravelDLS. ' +
        'Usa un correo distinto y, si el nombre ya existe, modifícalo (por ejemplo añadiendo la licencia o iniciales). ' +
        'Si ya intentaste crear la cuenta antes, vuelve a pulsar «Crear y vincular» para reintentar solo la vinculación.'
      );
    }
    return raw;
  }

  private savePendingUserLink(idDriver: number, idUser: number): void {
    sessionStorage.setItem(`${PENDING_USER_LINK_PREFIX}${idDriver}`, String(idUser));
  }

  private getPendingUserLink(idDriver: number): number | null {
    const raw = sessionStorage.getItem(`${PENDING_USER_LINK_PREFIX}${idDriver}`);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  private clearPendingUserLink(idDriver: number): void {
    sessionStorage.removeItem(`${PENDING_USER_LINK_PREFIX}${idDriver}`);
  }

  openEditModal(d: Driver): void {
    this.selectedActiveDriver.set(d);
    this.editForm = {
      name: d.user?.name ? stripLicenseFromDisplayName(d.user.name, d.license) : '—',
      email: d.user?.email ?? '—',
      license: d.license ?? '',
      passport: d.passport ?? '',
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedActiveDriver.set(null);
  }

  onEditBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-fondo')) {
      this.closeEditModal();
    }
  }

  isEditFormValid(): boolean {
    return this.editForm.license.trim().length >= 5 && this.editForm.passport.trim().length >= 5;
  }

  onSubmitEdit(): void {
    const d = this.selectedActiveDriver();
    if (!d || !this.isEditFormValid() || this.isSaving()) return;

    this.isSaving.set(true);
    this.driverService
      .updateDriver(d.idDriver, {
        license: this.editForm.license.trim(),
        passport: this.editForm.passport.trim(),
      })
      .subscribe({
        next: () => {
          this.ui.showToast('Perfil actualizado correctamente.', 'success');
          this.isSaving.set(false);
          this.closeEditModal();
          this.refreshAfterMutation();
        },
        error: (err) => {
          this.ui.showToast(getHttpErrorMessage(err), 'error');
          this.isSaving.set(false);
        },
      });
  }

  async onDeleteDriver(d: Driver): Promise<void> {
    const driverName = this.driverDisplayName(d);
    const confirmar = await this.ui.confirmar(
      'Eliminar conductor',
      `¿Eliminar permanentemente a ${driverName} (Licencia: ${d.license})? Esta acción es irreversible.`,
    );

    if (!confirmar) return;

    this.isSaving.set(true);
    this.driverService.deleteDriver(d.idDriver).subscribe({
      next: () => {
        this.removePendingName(d.idDriver);
        this.ui.showToast('Conductor eliminado correctamente.', 'success');
        this.isSaving.set(false);
        if (this.drivers().length === 1 && this.currentPage() > 1) {
          this.currentPage.update((p) => p - 1);
        }
        this.refreshAfterMutation();
      },
      error: (err) => {
        this.ui.showToast(getHttpErrorMessage(err), 'error');
        this.isSaving.set(false);
      },
    });
  }

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

  private getStoredPendingName(idDriver: number): string | undefined {
    if (!this.companyId) return undefined;
    const store = this.readPendingNamesStore();
    return store[String(this.companyId)]?.[String(idDriver)];
  }

  private savePendingName(idDriver: number, name: string): void {
    if (!this.companyId) return;
    const store = this.readPendingNamesStore();
    const key = String(this.companyId);
    store[key] = { ...(store[key] ?? {}), [String(idDriver)]: name };
    localStorage.setItem(PENDING_NAMES_STORAGE_KEY, JSON.stringify(store));
  }

  private removePendingName(idDriver: number): void {
    if (!this.companyId) return;
    const store = this.readPendingNamesStore();
    const key = String(this.companyId);
    if (!store[key]) return;
    delete store[key][String(idDriver)];
    localStorage.setItem(PENDING_NAMES_STORAGE_KEY, JSON.stringify(store));
  }

  private readPendingNamesStore(): PendingNamesByCompany {
    try {
      const raw = localStorage.getItem(PENDING_NAMES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingNamesByCompany) : {};
    } catch {
      return {};
    }
  }
}
