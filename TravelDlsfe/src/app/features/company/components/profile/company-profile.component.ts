import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../platformAdmin/service/company.service';
import { Company } from '../../../platformAdmin/interface/company.interface';
import { InteractionService } from '../../../../shared/service/interaction.service';
import { getHttpErrorMessage } from '../../../../core/http/http-error.util';

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
          <p>Información de tu empresa</p>
        </div>
      </header>

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Company Info Header -->
        <div class="company-info-header">
          <div class="company-icon-large" *ngIf="!company()?.photoUrl">
            <i class="fa-solid fa-building"></i>
          </div>
          <img *ngIf="company()?.photoUrl" [src]="company()?.photoUrl" class="company-photo-large" alt="Logo de empresa" />
          <div class="company-details-large">
            <h2>{{ company()?.businessName || user()?.name || 'Empresa' }}</h2>
            <span class="ruc-text">RUC: {{ company()?.ruc || form.get('ruc')?.value || 'Pendiente' }}</span>
          </div>
        </div>

        <hr class="divider" />

        <!-- Form Section -->
        <form class="company-form" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="ruc">
              <i class="fa-solid fa-id-card label-icon"></i> RUC
            </label>
            <input 
              type="text" 
              id="ruc" 
              class="form-input" 
              formControlName="ruc"
              placeholder="Ej: 20123456789"
            />
          </div>

          <div class="form-group">
            <label for="razonSocial">
              <i class="fa-solid fa-building label-icon"></i> Razón Social
            </label>
            <input 
              type="text" 
              id="razonSocial" 
              class="form-input" 
              formControlName="razonSocial"
              placeholder="Ej: Mi Empresa S.A.C."
            />
          </div>

          <div class="form-group">
            <label for="logo">
              <i class="fa-solid fa-link label-icon"></i> URL del Logo <span class="opcional">(Opcional)</span>
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
            <button type="submit" class="btn-save" [disabled]="form.invalid || saving || !form.dirty">
              <i class="fa-solid fa-floppy-disk"></i> 
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .header-content p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    /* Content Card */
    .content-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
      padding: 32px;
    }

    /* Company Info Header */
    .company-info-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .company-icon-large {
      width: 64px;
      height: 64px;
      background: #eef2ff;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: #4f46e5;
      font-size: 28px;
      flex-shrink: 0;
    }

    .company-photo-large {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid #e2e8f0;
    }

    .company-details-large h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }

    .ruc-text {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .divider {
      border: none;
      border-top: 1px solid #f1f5f9;
      margin: 0 0 24px 0;
    }

    /* Form Styles */
    .company-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }

    .label-icon {
      color: inherit;
      font-size: 15px;
    }

    .opcional {
      font-weight: 400;
      color: #94a3b8;
      font-size: 13px;
      margin-left: 4px;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #334155;
      background: #fff;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .form-input-file {
      padding: 10px 14px;
      color: #0f172a;
      background: white;
    }

    .form-input-file::file-selector-button {
      background: transparent;
      border: none;
      color: #0f172a;
      font-weight: 500;
      padding: 0;
      margin-right: 8px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .btn-save {
      background: #1B193B; /* Dark purple matching the sidebar */
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }

    .btn-save:hover {
      background: #2d2a5c;
    }

    .btn-save:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `
})
export class CompanyProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly ui = inject(InteractionService);

  readonly user = this.auth.user;
  company = signal<Company | null>(null);
  saving = false;

  form = this.fb.group({
    ruc: ['', Validators.required],
    razonSocial: ['', Validators.required],
    logo: [''], // Optional
  });

  constructor() {
    effect(() => {
      const currentUser = this.user();
      
      // Fallback inicial con los datos básicos del usuario
      if (currentUser) {
        this.form.patchValue({
          razonSocial: currentUser.name || '',
        }, { emitEvent: false });
        this.form.markAsPristine();
      }

      if (currentUser?.idCompany) {
        this.companyService.getById(currentUser.idCompany).subscribe({
          next: (c: any) => {
            // Si el backend envuelve la respuesta en { data: ... } o { company: ... }
            const companyData = c.data || c.company || c;

            const mappedCompany: Company = {
              ...companyData,
              businessName: companyData.businessName || companyData.business_name || currentUser.name,
              ruc: companyData.ruc || companyData.ruc,
              photoUrl: companyData.photoUrl || companyData.photo_url
            };

            this.company.set(mappedCompany);
            this.form.patchValue({
              ruc: mappedCompany.ruc || '',
              razonSocial: mappedCompany.businessName || '',
              logo: mappedCompany.photoUrl || '',
            }, { emitEvent: false });
            this.form.markAsPristine();
          },
          error: (err) => {
            console.error('El backend denegó el acceso (403) o no encontró (404) la empresa:', err);
          }
        });
      }
    });
  }

  onSubmit() {
    if (this.form.invalid || !this.form.dirty) return;
    
    const currentUser = this.user();
    if (!currentUser?.idCompany) {
      this.ui.showToast('No se encontró el ID de tu empresa', 'error');
      return;
    }

    this.saving = true;
    const formValues = this.form.getRawValue();

    const updatePayload = {
      businessName: formValues.razonSocial ?? undefined,
      ruc: formValues.ruc ?? undefined,
      photoUrl: formValues.logo || null
    };

    this.companyService.update(currentUser.idCompany, updatePayload).subscribe({
      next: (c: any) => {
        this.saving = false;
        this.form.markAsPristine();
        this.ui.showToast('Empresa actualizada correctamente', 'success');
        
        // Actualizar la vista con los nuevos datos devueltos
        const companyData = c.data || c.company || c;
        const mappedCompany: Company = {
          ...companyData,
          businessName: companyData.businessName || companyData.business_name,
          ruc: companyData.ruc,
          photoUrl: companyData.photoUrl || companyData.photo_url
        };
        this.company.set(mappedCompany);
      },
      error: (err) => {
        this.saving = false;
        this.ui.showToast(getHttpErrorMessage(err) || 'Error al actualizar', 'error');
        console.error('Error al actualizar la empresa:', err);
      }
    });
  }
}

