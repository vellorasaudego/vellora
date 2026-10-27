import { cleanText, isValidIsoDate } from "./validation";
import type {
  FinanceChargeInput,
  FinanceExpenseCategory,
  FinanceExpenseInput,
  FinancePayrollExpenseUpdate,
  FinanceReceiptInput,
} from "./data";

const EXPENSE_CATEGORIES = new Set<FinanceExpenseCategory>([
  "marketing",
  "sistema",
  "contabilidade",
  "impostos",
  "operacao",
  "outros",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ParseResult<T> = { value: T; error?: never } | { value?: never; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseAmountCents(value: unknown): number | null {
  const raw = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
  const match = /^(\d{1,8})(?:[.,](\d{1,2}))?$/.exec(raw);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 2_000_000_000 ? cents : null;
}

function parseMonth(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return value;
}

export function isValidFinanceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseFinanceChargeInput(body: unknown): ParseResult<FinanceChargeInput> {
  if (!isRecord(body)) return { error: "Informe os dados da cobrança." };
  const label = cleanText(body.label, 180);
  const competence_month = parseMonth(body.competence_month);
  const due_date = typeof body.due_date === "string" ? body.due_date : "";
  const amount_cents = parseAmountCents(body.amount);

  if (!label) return { error: "Informe o cliente ou contrato." };
  if (!competence_month) return { error: "Informe uma competência válida." };
  if (!isValidIsoDate(due_date)) return { error: "Informe uma data de vencimento válida." };
  if (amount_cents === null) return { error: "Informe um valor maior que zero, com até duas casas decimais." };

  return {
    value: { label, competence_month, due_date, amount_cents },
  };
}

export function parseFinanceReceiptInput(body: unknown): ParseResult<FinanceReceiptInput> {
  if (!isRecord(body)) return { error: "Informe os dados do recebimento." };
  const received_on = typeof body.received_on === "string" ? body.received_on : "";
  const amount_cents = parseAmountCents(body.amount);

  if (!isValidIsoDate(received_on)) return { error: "Informe uma data de recebimento válida." };
  if (amount_cents === null) return { error: "Informe um valor maior que zero, com até duas casas decimais." };

  return { value: { received_on, amount_cents } };
}

export function parseFinanceExpenseInput(body: unknown): ParseResult<FinanceExpenseInput> {
  if (!isRecord(body)) return { error: "Informe os dados da despesa." };
  const expense_date = typeof body.expense_date === "string" ? body.expense_date : "";
  const category =
    typeof body.category === "string" && EXPENSE_CATEGORIES.has(body.category as FinanceExpenseCategory)
      ? (body.category as FinanceExpenseCategory)
      : null;
  const description = cleanText(body.description, 180);
  const amount_cents = parseAmountCents(body.amount);
  const paidValue = typeof body.paid_on === "string" ? body.paid_on : "";
  const paid_on = paidValue === "" ? null : paidValue;

  if (!isValidIsoDate(expense_date)) return { error: "Informe uma data válida para a despesa." };
  if (!category) return { error: "Selecione uma categoria válida." };
  if (!description) return { error: "Informe a descrição da despesa." };
  if (amount_cents === null) return { error: "Informe um valor maior que zero, com até duas casas decimais." };
  if (paid_on && !isValidIsoDate(paid_on)) return { error: "Informe uma data de pagamento válida." };

  return {
    value: { expense_date, category, description, amount_cents, paid_on },
  };
}

export function parseFinancePayrollExpenseUpdateInput(body: unknown): ParseResult<FinancePayrollExpenseUpdate> {
  if (!isRecord(body)) return { error: "Informe os dados do plantão." };
  const amount_cents = parseAmountCents(body.amount);
  const paidValue = typeof body.paid_on === "string" ? body.paid_on : "";
  const paid_on = paidValue === "" ? null : paidValue;

  if (amount_cents === null) return { error: "Informe um valor maior que zero, com até duas casas decimais." };
  if (paid_on && !isValidIsoDate(paid_on)) return { error: "Informe uma data de pagamento válida." };

  return { value: { amount_cents, paid_on } };
}
