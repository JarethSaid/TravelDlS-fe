/** Nombre visible sin el sufijo "(LIC-…)" guardado en users.name por unicidad. */
export function stripLicenseFromDisplayName(name: string, license?: string): string {
  const trimmed = name.trim();
  if (license?.trim()) {
    const suffix = ` (${license.trim()})`;
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length).trim();
    }
  }
  return trimmed.replace(/\s+\(LIC[\w-]*\)\s*$/i, '').trim() || trimmed;
}

export function driverDisplayName(
  userName: string | undefined,
  fallbackName: string | undefined,
  license: string | undefined,
  idDriver: number,
): string {
  const raw = userName?.trim() || fallbackName?.trim();
  if (!raw) return `Conductor #${idDriver}`;
  return stripLicenseFromDisplayName(raw, license);
}
