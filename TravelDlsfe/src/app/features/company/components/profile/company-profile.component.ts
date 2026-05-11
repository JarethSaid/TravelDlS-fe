import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../platformAdmin/services/company.service';
import { Company } from '../../../platformAdmin/interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <header class="page-header">
        <div class="header-content">
          <h1>Mi Empresa</h1>
          <p>Gestiona la identidad y datos fiscales de tu organización</p>
        </div>
      </header>

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Loading State -->
        <div class="loading-overlay" *ngIf="loading()">
          <div class="spinner"></div>
          <span>Cargando datos de empresa...</span>
        </div>

        <div [class.content-blur]="loading()">
          <!-- Company Info Header -->
          <div class="company-info-header">
            <div class="company-icon-large" *ngIf="!company()?.photoUrl">
              <!-- Lucide Building Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="9" x2="15" y1="22" y2="22"/><line x1="9" x2="15" y1="18" y2="18"/><line x1="9" x2="15" y1="14" y2="14"/><line x1="9" x2="15" y1="10" y2="10"/><line x1="9" x2="15" y1="6" y2="6"/></svg>
            </div>
            <img *ngIf="company()?.photoUrl" [src]="company()?.photoUrl" class="company-photo-large" alt="Logo de empresa" />
            <div class="company-details-large">
              <h2>{{ currentFormValue().razonSocial || company()?.businessName || 'Empresa' }}</h2>
              <span class="ruc-badge">RUC: {{ currentFormValue().ruc || 'Pendiente' }}</span>
            </div>
          </div>

          <hr class="divider" />

          <!-- Form Section -->
          <form class="company-form" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <div class="form-group">
                <label for="ruc">
                  <!-- Lucide FileText Icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="label-icon"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  RUC
                </label>
                <input 
                  type="text" 
                  id="ruc" 
                  class="form-input" 
                  formControlName="ruc"
                  placeholder="Ej: 123456A"
                  [class.is-invalid]="(form.get('ruc')?.invalid && form.get('ruc')?.touched) || rucError()"
                  (input)="rucError.set(false)"
                />
                <span class="error-msg" *ngIf="rucError()">
                  A company with this RUC already exists.
                </span>
                <span class="error-msg" *ngIf="form.get('ruc')?.hasError('required') && form.get('ruc')?.touched">
                  El RUC es obligatorio
                </span>
              </div>

              <div class="form-group">
                <label for="razonSocial">
                  <!-- Lucide Building Icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="label-icon"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="9" x2="15" y1="22" y2="22"/><line x1="9" x2="15" y1="18" y2="18"/><line x1="9" x2="15" y1="14" y2="14"/><line x1="9" x2="15" y1="10" y2="10"/><line x1="9" x2="15" y1="6" y2="6"/></svg>
                  Razón Social
                </label>
                <input 
                  type="text" 
                  id="razonSocial" 
                  class="form-input" 
                  formControlName="razonSocial"
                  placeholder="Ej: Compañía Prueba"
                  [class.is-invalid]="form.get('razonSocial')?.invalid && form.get('razonSocial')?.touched"
                />
                <span class="error-msg" *ngIf="form.get('razonSocial')?.hasError('required') && form.get('razonSocial')?.touched">
                  La razón social es obligatoria
                </span>
              </div>
            </div>

            <div class="form-group full-width">
              <label for="logo">
                <!-- Lucide Link Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="label-icon"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                URL del Logo <span class="opcional">(Opcional)</span>
              </label>
              <input 
                type="text" 
                id="logo" 
                class="form-input" 
                formControlName="logo"
                placeholder="Ej: https://midominio.com/logo.png"
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-save" [disabled]="!isActuallyDirty() || form.invalid || saving">
                <svg *ngIf="!saving" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <div class="btn-spinner" *ngIf="saving"></div>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .page-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* Header */
    .page-header h1 {
      font-size: 28px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }

    .page-header p {
      font-size: 16px;
      color: #64748b;
      margin: 0;
    }

    /* Content Card */
    .content-card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #f1f5f9;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      backdrop-filter: blur(4px);
    }

    .content-blur {
      filter: blur(4px);
      pointer-events: none;
    }

    /* Spinner */
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #f1f5f9;
      border-top: 4px solid #8a5cc2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Company Info Header */
    .company-info-header {
      display: flex;
      align-items: center;
      gap: 28px;
      margin-bottom: 40px;
    }

    .company-icon-large {
      width: 84px;
      height: 84px;
      background: #f3f0ff;
      border-radius: 20px;
      display: grid;
      place-items: center;
      color: #8a5cc2;
      flex-shrink: 0;
    }

    .company-photo-large {
      width: 84px;
      height: 84px;
      border-radius: 20px;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #f1f5f9;
    }

    .company-details-large h2 {
      margin: 0 0 8px 0;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .ruc-badge {
      font-size: 14px;
      color: #64748b;
      font-weight: 600;
      background: #f8fafc;
      padding: 6px 16px;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
    }

    .divider {
      border: none;
      border-top: 1px solid #f1f5f9;
      margin: 0 0 40px 0;
    }

    /* Form Styles */
    .company-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .label-icon {
      color: #8a5cc2;
    }

    .opcional {
      font-weight: 500;
      color: #94a3b8;
      font-size: 13px;
      margin-left: 4px;
      text-transform: none;
    }

    .form-input {
      width: 100%;
      padding: 16px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      font-size: 15px;
      color: #334155;
      background: #f8fafc;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: #8a5cc2;
      background: white;
      box-shadow: 0 0 0 4px rgba(138, 92, 194, 0.1);
    }

    .form-input.is-invalid {
      border-color: #f43f5e;
      background: #fffafa;
      box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.05);
    }

    .error-msg {
      font-size: 13px;
      color: #f43f5e;
      font-weight: 600;
      margin-top: -6px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .btn-save {
      background: #8a5cc2;
      color: white;
      border: none;
      padding: 16px 36px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
      box-shadow: 0 6px 12px rgba(138, 92, 194, 0.25);
    }

    .btn-save:hover:not(:disabled) {
      background: #7a4bb1;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(138, 92, 194, 0.3);
    }

    .btn-save:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-save:disabled {
      background: #cbd5e1;
      color: #94a3b8;
      cursor: not-allowed;
      box-shadow: none;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class CompanyProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  readonly user = this.auth.user;
  company = signal<Company | null>(null);
  saving = false;
  loading = signal(true);
  rucError = signal(false);

  // Store initial values to detect real changes
  initialValues = signal<{ ruc: string; razonSocial: string; logo: string }>({
    ruc: '',
    razonSocial: '',
    logo: ''
  });

  form = this.fb.group({
    ruc: ['', Validators.required],
    razonSocial: ['', Validators.required],
    logo: [''],
  });

  // Create a signal from form changes to make 'isActuallyDirty' reactive
  // Using startWith to ensure it has the initial form value immediately
  currentFormValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  // Computed to check if values are truly different from initial
  isActuallyDirty = computed(() => {
    const current = this.currentFormValue();
    const initial = this.initialValues();
    
    return (current.ruc ?? '') !== initial.ruc || 
           (current.razonSocial ?? '') !== initial.razonSocial || 
           (current.logo || '') !== initial.logo;
  });

  ngOnInit() {
    this.loadCompanyData();
  }

  private loadCompanyData() {
    const currentUser = this.user();
    if (!currentUser?.idCompany) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.companyService.getById(currentUser.idCompany).subscribe({
      next: (c: any) => {
        const companyData = c.data || c.company || c;

        const mappedCompany: Company = {
          ...companyData,
          businessName: companyData.businessName || companyData.business_name || currentUser.name,
          ruc: companyData.ruc,
          photoUrl: companyData.photoUrl || companyData.photo_url
        };

        const initial = {
          ruc: mappedCompany.ruc || '',
          razonSocial: mappedCompany.businessName || '',
          logo: mappedCompany.photoUrl || '',
        };

        this.company.set(mappedCompany);
        this.initialValues.set(initial);
        // Using patchValue WITHOUT emitEvent: false so currentFormValue updates
        this.form.patchValue(initial);
        this.form.markAsPristine();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading company data:', err);
        this.ui.showToast('No se pudo cargar la información de la empresa', 'error');
        this.loading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid || !this.isActuallyDirty()) return;
    
    const idCompany = this.user()?.idCompany;
    if (!idCompany) {
      this.ui.showToast('No se encontró el ID de tu empresa', 'error');
      return;
    }

    this.saving = true;
    this.rucError.set(false);

    const currentValues = this.form.getRawValue();
    const initial = this.initialValues();

    // Partial update payload
    const updatePayload: any = {};
    if (currentValues.razonSocial !== initial.razonSocial) updatePayload.businessName = currentValues.razonSocial;
    if (currentValues.ruc !== initial.ruc) updatePayload.ruc = currentValues.ruc;
    if ((currentValues.logo || '') !== initial.logo) updatePayload.photoUrl = currentValues.logo || null;

    this.companyService.update(idCompany, updatePayload).subscribe({
      next: (c: any) => {
        this.saving = false;
        this.ui.showToast('Empresa actualizada correctamente', 'success');
        
        const companyData = c.data || c.company || c;
        const mappedCompany: Company = {
          ...companyData,
          businessName: companyData.businessName || companyData.business_name,
          ruc: companyData.ruc,
          photoUrl: companyData.photoUrl || companyData.photo_url
        };

        // Update initial values
        const newInitial = {
          ruc: mappedCompany.ruc || '',
          razonSocial: mappedCompany.businessName || '',
          logo: mappedCompany.photoUrl || '',
        };

        this.company.set(mappedCompany);
        this.initialValues.set(newInitial);
        
        // Sync form with new initial values (this will trigger currentFormValue update)
        this.form.patchValue(newInitial);
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saving = false;
        const errorMsg = getHttpErrorMessage(err);
        
        if (errorMsg.includes('already exists') || (err.error?.message && err.error.message.includes('already exists'))) {
          this.rucError.set(true);
        } else {
          this.ui.showToast(errorMsg || 'Error al actualizar', 'error');
        }
        console.error('Error updating company:', err);
      }
    });
  }
}





