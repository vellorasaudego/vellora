export type AuthProvider = "legacy" | "supabase";

/**
 * Resolves the provider from configuration without ever treating an unknown
 * value as permission to enable a new authentication backend.
 */
export function resolveAuthProvider(value: string | undefined): AuthProvider {
  return value?.trim().toLowerCase() === "supabase" ? "supabase" : "legacy";
}
