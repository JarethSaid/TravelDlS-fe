import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Base URL del API Adonis (sin slash final). Ajusta si tu backend usa otro host/puerto. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
