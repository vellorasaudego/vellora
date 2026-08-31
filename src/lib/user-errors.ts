export const DUPLICATE_ACCOUNT_EMAIL_MESSAGE =
  'Este e-mail já está cadastrado. Use “Vincular conta existente” ou informe outro e-mail.';

export function isDuplicateAccountEmailError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : error instanceof Error
        ? error.message
        : "";
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "";
  const normalized = `${code} ${message}`.toLowerCase();

  return (
    normalized.includes("email_exists") ||
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("e-mail já está cadastrado") ||
    normalized.includes("email já está cadastrado") ||
    (normalized.includes("duplicate key") && normalized.includes("email"))
  );
}
