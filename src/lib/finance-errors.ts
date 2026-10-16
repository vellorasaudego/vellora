export const FINANCE_SETUP_MESSAGE =
  "O banco financeiro ainda não está configurado. A migration do módulo precisa ser aplicada antes de salvar lançamentos.";

export class FinanceConflictError extends Error {
  constructor(message = "O valor informado ultrapassa o saldo desta cobrança.") {
    super(message);
    this.name = "FinanceConflictError";
  }
}

export class FinanceNotFoundError extends Error {
  constructor(message = "Lançamento financeiro não encontrado.") {
    super(message);
    this.name = "FinanceNotFoundError";
  }
}

export function isFinanceSchemaUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  if (code === "42P01" || code === "PGRST205") return true;
  return (
    (message.includes("finance_charges") ||
      message.includes("finance_receipts") ||
      message.includes("finance_expenses")) &&
    (message.includes("does not exist") ||
      message.includes("could not find the table") ||
      message.includes("schema cache"))
  );
}
