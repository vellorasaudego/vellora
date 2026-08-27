export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function validateSupabaseConfig(
  urlValue: string | undefined,
  keyValue: string | undefined,
): SupabasePublicConfig {
  const url = urlValue?.trim() || "";
  const publishableKey = keyValue?.trim() || "";

  if (!url || !publishableKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY antes de habilitar o Supabase Auth.",
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("URL inválida");
    }
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL HTTP(S) válida.");
  }

  return { url, publishableKey };
}
