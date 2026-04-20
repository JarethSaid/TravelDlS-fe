import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Record<string, unknown> | null | undefined;
    if (body && typeof body['message'] === 'string' && body['message'].length > 0) {
      return body['message'];
    }
    if (body && Array.isArray(body['errors'])) {
      const msgs = (body['errors'] as { message?: string }[])
        .map((x) => x.message)
        .filter((m): m is string => !!m);
      if (msgs.length) return msgs.join('. ');
    }
    if (
      body &&
      body['errors'] &&
      typeof body['errors'] === 'object' &&
      !Array.isArray(body['errors'])
    ) {
      const msgs = Object.values(body['errors'] as Record<string, string[] | string>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((m): m is string => typeof m === 'string');
      if (msgs.length) return msgs.join('. ');
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa la URL del API y CORS.';
    }
    return err.message || `Error ${err.status}`;
  }
  return 'Error desconocido';
}
