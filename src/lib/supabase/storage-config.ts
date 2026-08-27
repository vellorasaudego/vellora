export type StorageProvider = "legacy" | "supabase";

/**
 * Resolves the storage backend without ever falling back between providers.
 * An unset value intentionally keeps the existing R2 implementation active
 * until the production data/runtime cutover is complete.
 */
export function resolveStorageProvider(value: string | undefined): StorageProvider {
  const provider = value?.trim().toLowerCase();
  if (!provider || provider === "legacy") return "legacy";
  if (provider === "supabase") return "supabase";
  throw new Error("VELLORA_STORAGE_PROVIDER deve ser legacy ou supabase.");
}
