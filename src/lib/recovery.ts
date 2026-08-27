export function normalizeRecoveryEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

export function normalizeRecoveryPassword(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const hasWrappingQuotes =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"));

  return hasWrappingQuotes ? normalized.slice(1, -1) : normalized;
}
