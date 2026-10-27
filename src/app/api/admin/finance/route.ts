import { NextRequest, NextResponse } from "next/server";
import {
  createFinanceCharge,
  createFinanceExpense,
  deleteFinanceCharge,
  deleteFinanceExpense,
  getFinanceDashboardSnapshot,
  recordFinanceReceipt,
  updateFinanceCharge,
  updateFinanceExpense,
  updateFinancePayrollExpense,
  updateFinanceExpensePayment,
} from "@/lib/data";
import { apiError } from "@/lib/api-error";
import { requireRole } from "@/lib/guard";
import { isValidIsoDate } from "@/lib/validation";
import {
  FINANCE_SETUP_MESSAGE,
  FinanceConflictError,
  FinanceNotFoundError,
  isFinanceSchemaUnavailable,
} from "@/lib/finance-errors";
import {
  isValidFinanceId,
  parseFinanceChargeInput,
  parseFinanceExpenseInput,
  parseFinancePayrollExpenseUpdateInput,
  parseFinanceReceiptInput,
} from "@/lib/finance-validation";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function financeError(error: unknown, context: string, fallback: string) {
  if (isFinanceSchemaUnavailable(error)) {
    return NextResponse.json({ error: FINANCE_SETUP_MESSAGE }, { status: 503 });
  }
  if (error instanceof FinanceConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof FinanceNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return apiError(error, context, fallback);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(request: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const month = request.nextUrl.searchParams.get("month") || "";
  if (!MONTH_PATTERN.test(month)) {
    return NextResponse.json({ error: "Informe uma competência válida." }, { status: 400 });
  }

  try {
    const snapshot = await getFinanceDashboardSnapshot(month);
    return NextResponse.json(snapshot);
  } catch (error) {
    return financeError(error, "api/admin/finance", "Não foi possível carregar os dados financeiros.");
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const body: unknown = await request.json().catch(() => null);
  if (!isObject(body)) {
    return NextResponse.json({ error: "Informe os dados do lançamento." }, { status: 400 });
  }

  try {
    if (body.action === "create_charge") {
      const parsed = parseFinanceChargeInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await createFinanceCharge(parsed.value, guard.session.userId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "record_receipt") {
      const chargeId = typeof body.charge_id === "string" ? body.charge_id : "";
      if (!isValidFinanceId(chargeId)) {
        return NextResponse.json({ error: "Cobrança inválida." }, { status: 400 });
      }
      const parsed = parseFinanceReceiptInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await recordFinanceReceipt(chargeId, parsed.value, guard.session.userId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "create_expense") {
      const parsed = parseFinanceExpenseInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await createFinanceExpense(parsed.value, guard.session.userId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação financeira inválida." }, { status: 400 });
  } catch (error) {
    return financeError(error, "api/admin/finance", "Não foi possível salvar o lançamento financeiro.");
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const body: unknown = await request.json().catch(() => null);
  if (!isObject(body)) {
    return NextResponse.json({ error: "Informe os dados do lançamento." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!isValidFinanceId(id)) {
    return NextResponse.json({ error: "Identificador financeiro inválido." }, { status: 400 });
  }

  try {
    if (body.action === "update_charge") {
      const parsed = parseFinanceChargeInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await updateFinanceCharge(id, parsed.value);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_expense") {
      const parsed = parseFinanceExpenseInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await updateFinanceExpense(id, parsed.value);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_payroll_payment") {
      const paidOn = body.paid_on === null || body.paid_on === "" ? null : body.paid_on;
      if (paidOn !== null && (typeof paidOn !== "string" || !isValidIsoDate(paidOn))) {
        return NextResponse.json({ error: "Informe uma data de pagamento válida." }, { status: 400 });
      }
      await updateFinanceExpensePayment(id, paidOn as string | null);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_payroll_expense") {
      const parsed = parseFinancePayrollExpenseUpdateInput(body);
      if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
      await updateFinancePayrollExpense(id, parsed.value);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação financeira inválida." }, { status: 400 });
  } catch (error) {
    return financeError(error, "api/admin/finance", "Não foi possível atualizar o lançamento financeiro.");
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const entity = request.nextUrl.searchParams.get("entity");
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!isValidFinanceId(id)) {
    return NextResponse.json({ error: "Identificador financeiro inválido." }, { status: 400 });
  }
  if (entity !== "charge" && entity !== "expense") {
    return NextResponse.json({ error: "Tipo de lançamento inválido." }, { status: 400 });
  }

  try {
    if (entity === "charge") await deleteFinanceCharge(id);
    else await deleteFinanceExpense(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return financeError(error, "api/admin/finance", "Não foi possível excluir o lançamento financeiro.");
  }
}
