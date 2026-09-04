export function looksLikeHref(value: string) {
  return /^(https?:\/\/|mailto:|\/d\/|\/p\/)/i.test(value.trim());
}

export function hrefFromValue(value: string) {
  const trimmed = value.trim();
  return looksLikeHref(trimmed) ? trimmed : undefined;
}
