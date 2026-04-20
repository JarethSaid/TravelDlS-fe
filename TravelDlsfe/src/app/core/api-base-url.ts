import { InjectionToken } from '@angular/core';

/** Base URL del API Adonis (sin slash final). Ajusta si tu backend usa otro host/puerto. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3333',
});
