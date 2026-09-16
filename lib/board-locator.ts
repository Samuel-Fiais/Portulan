const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBoardLocator(value: string): { uuid: string } | { boardNumber: number } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return { uuid: trimmed };
  const digits = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[1-9]\d{0,8}$/.test(digits)) return { boardNumber: Number(digits) };
  return null;
}
