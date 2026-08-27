export type RateLimitProvider = "legacy" | "supabase";

/**
 * Keep the provider switch deliberately compatible with the other adapters:
 * only the explicit Supabase value enables the new backend.
 */
export function resolveRateLimitProvider(value: string | undefined): RateLimitProvider {
  return value?.trim().toLowerCase() === "supabase" ? "supabase" : "legacy";
}

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

/**
 * Supabase-backed public intake must have a server-verifiable challenge. In
 * legacy mode the historical opt-in behavior remains available, but an
 * explicit requirement always wins. A false flag cannot turn protection off
 * after the Supabase provider has been selected.
 */
export function resolveTurnstileRequired(
  dataProvider: string | undefined,
  requiredFlag: string | undefined,
): boolean {
  if (parseBooleanFlag(requiredFlag) === true) return true;
  return resolveRateLimitProvider(dataProvider) === "supabase";
}
