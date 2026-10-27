"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  FinanceCashFlowPoint,
  FinanceCharge,
  FinanceDashboardSnapshot,
  FinanceExpense,
  FinanceExpenseCategory,
} from "@/lib/data";
import { emptyFinanceSnapshot, totalChargeBalance } from "@/lib/finance-utils";

type DialogState =
  | { kind: "charge"; record?: FinanceCharge }
  | { kind: "expense"; record?: FinanceExpense }
  | { kind: "receipt"; charge: FinanceCharge }
  | null;

const EXPENSE_CATEGORIES: Array<{ value: FinanceExpenseCategory; label: string }> = [
  { value: "marketing", label: "Marketing" },
  { value: "sistema", label: "Sistema" },
  { value: "contabilidade", label: "Contabilidade" },
  { value: "impostos", label: "Impostos" },
  { value: "operacao", label: "Operação" },
  { value: "outros", label: "Outros" },
];

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-base text-[var(--foreground)] sm:text-sm";
const LABEL_CLASS = "block text-sm font-semibold text-[var(--foreground)]";
const TABLE_HEAD_CLASS =
  "border-b border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";
const TABLE_CELL_CLASS = "border-b border-[var(--border)] px-3 py-3 align-middle text-sm text-[var(--foreground)]";
const CHART_GREEN = "#0ca30c";
const CHART_RED = "#d03b3b";
const CHART_LINE = "#143f3a";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatAxisCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatMonth(value: string, style: "short" | "long" = "long"): string {
  const date = new Date(value + "-01T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function getChargeStatus(
  charge: FinanceCharge,
): { label: string; className: string } {
  if (charge.received_cents >= charge.amount_cents) {
    return {
      label: "Pago",
      className: "bg-[var(--status-good-bg)] text-[var(--status-good)]",
    };
  }
  if (charge.received_cents > 0) {
    return {
      label: "Parcial",
      className: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
    };
  }
  if (charge.due_date < todayInSaoPaulo()) {
    return {
      label: "Vencido",
      className: "bg-[var(--status-critical-bg)] text-[var(--status-critical)]",
    };
  }
  return {
    label: "Em aberto",
    className: "bg-[var(--surface-soft)] text-[var(--muted)]",
  };
}

function categoryLabel(category: FinanceExpenseCategory): string {
  if (category === "equipe") return "Equipe";
  return EXPENSE_CATEGORIES.find((option) => option.value === category)?.label || "Outros";
}

function MetricCard({
  label,
  value,
  helper,
  negative = false,
}: {
  label: string;
  value: number;
  helper: string;
  negative?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p
        className={
          "mt-2 break-words text-2xl font-semibold tabular-nums sm:text-3xl " +
          (negative ? "text-[var(--status-critical)]" : "text-[var(--foreground)]")
        }
      >
        {formatCurrency(value)}
      </p>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{helper}</p>
    </Card>
  );
}

function FinanceDialog({
  dialog,
  month,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  dialog: DialogState;
  month: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const dialogRef = useCallback((element: HTMLDialogElement | null) => {
    if (element && !element.open) element.showModal();
  }, []);

  if (!dialog) return null;

  const charge = dialog.kind === "charge" ? dialog.record : undefined;
  const expense = dialog.kind === "expense" ? dialog.record : undefined;
  const payrollExpense = expense?.category === "equipe";
  const receiptCharge = dialog.kind === "receipt" ? dialog.charge : undefined;
  const title =
    dialog.kind === "charge"
      ? charge
        ? "Editar cobrança"
        : "Nova cobrança"
      : dialog.kind === "expense"
        ? payrollExpense
          ? "Editar plantão"
          : expense
          ? "Editar despesa"
          : "Nova despesa"
        : "Registrar recebimento";
  const description =
    payrollExpense
      ? "Ajuste o valor deste plantão e registre a data do pagamento."
      : dialog.kind === "receipt"
      ? "Informe a data e o valor recebido para esta cobrança."
      : "Os campos marcados com * são obrigatórios.";
  const remainingCents = receiptCharge
    ? Math.max(0, receiptCharge.amount_cents - receiptCharge.received_cents)
    : 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="finance-dialog-title"
      aria-describedby="finance-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl backdrop:bg-black/40"
    >
      <div className="p-5 sm:p-7">
        <header className="mb-6">
          <h2 id="finance-dialog-title" className="text-xl font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <p id="finance-dialog-description" className="mt-1 text-sm text-[var(--muted)]">
            {description}
          </p>
        </header>

        <form onSubmit={submit}>
          {dialog.kind === "charge" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="charge-label" className={LABEL_CLASS}>Cliente / contrato *</label>
                <input
                  id="charge-label"
                  name="label"
                  type="text"
                  maxLength={180}
                  autoComplete="off"
                  required
                  defaultValue={charge?.label || ""}
                  placeholder="Ex.: contrato da família Silva"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="charge-competence" className={LABEL_CLASS}>Competência *</label>
                <input
                  id="charge-competence"
                  name="competence_month"
                  type="month"
                  required
                  defaultValue={charge?.competence_month || month}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="charge-due-date" className={LABEL_CLASS}>Vencimento *</label>
                <input
                  id="charge-due-date"
                  name="due_date"
                  type="date"
                  required
                  defaultValue={charge?.due_date || todayInSaoPaulo()}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="charge-amount" className={LABEL_CLASS}>Valor total (R$) *</label>
                <input
                  id="charge-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  required
                  defaultValue={charge ? centsToInput(charge.amount_cents) : ""}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {dialog.kind === "expense" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {payrollExpense ? (
                <div className="sm:col-span-2">
                  <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{expense?.payee || "Cuidador"}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Plantão em {formatDate(expense?.expense_date || null)}
                    </p>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="payroll-amount" className={LABEL_CLASS}>Valor do plantão (R$) *</label>
                    <input
                      id="payroll-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      required
                      defaultValue={expense ? centsToInput(expense.amount_cents) : ""}
                      className={INPUT_CLASS}
                    />
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      Alterações pontuais ficam vinculadas a este plantão e não serão substituídas por atualizações futuras do perfil.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="expense-date" className={LABEL_CLASS}>Data *</label>
                    <input
                      id="expense-date"
                      name="expense_date"
                      type="date"
                      required
                      defaultValue={expense?.expense_date || todayInSaoPaulo()}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="expense-category" className={LABEL_CLASS}>Categoria *</label>
                    <select
                      id="expense-category"
                      name="category"
                      required
                      defaultValue={expense?.category || ""}
                      className={INPUT_CLASS}
                    >
                      <option value="" disabled>Selecione</option>
                      {EXPENSE_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="expense-description" className={LABEL_CLASS}>Descrição *</label>
                    <input
                      id="expense-description"
                      name="description"
                      type="text"
                      maxLength={180}
                      autoComplete="off"
                      required
                      defaultValue={expense?.description || ""}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="expense-amount" className={LABEL_CLASS}>Valor (R$) *</label>
                    <input
                      id="expense-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      required
                      defaultValue={expense ? centsToInput(expense.amount_cents) : ""}
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}
              <div className={payrollExpense ? "sm:col-span-2" : ""}>
                <label htmlFor={payrollExpense ? "payroll-paid-on" : "expense-paid-on"} className={LABEL_CLASS}>
                  Data do pagamento
                </label>
                <input
                  id={payrollExpense ? "payroll-paid-on" : "expense-paid-on"}
                  name="paid_on"
                  type="date"
                  defaultValue={expense?.paid_on || ""}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {dialog.kind === "receipt" && receiptCharge && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl bg-[var(--surface-soft)] p-4">
                <p className="text-sm text-[var(--muted)]">Saldo desta cobrança</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatCurrency(remainingCents)}
                </p>
              </div>
              <div>
                <label htmlFor="receipt-date" className={LABEL_CLASS}>Data do recebimento *</label>
                <input
                  id="receipt-date"
                  name="received_on"
                  type="date"
                  required
                  defaultValue={todayInSaoPaulo()}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="receipt-amount" className={LABEL_CLASS}>Valor recebido (R$) *</label>
                <input
                  id="receipt-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max={centsToInput(remainingCents)}
                  step="0.01"
                  inputMode="decimal"
                  required
                  defaultValue={centsToInput(remainingCents)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-[var(--status-critical)]/25 bg-[var(--status-critical-bg)] px-4 py-3 text-sm leading-5 text-[var(--status-critical)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="min-h-11">
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy
                ? "Salvando…"
                : dialog.kind === "receipt"
                  ? "Registrar recebimento"
                  : payrollExpense
                    ? "Salvar pagamento"
                    : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function ChargeActions({
  charge,
  busy,
  onReceive,
  onEdit,
  onDelete,
}: {
  charge: FinanceCharge;
  busy: boolean;
  onReceive: (charge: FinanceCharge) => void;
  onEdit: (charge: FinanceCharge) => void;
  onDelete: (charge: FinanceCharge) => void;
}) {
  const openCents = Math.max(0, charge.amount_cents - charge.received_cents);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {openCents > 0 && (
        <button
          type="button"
          onClick={() => onReceive(charge)}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
        >
          Registrar recebimento
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(charge)}
        className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => onDelete(charge)}
        disabled={busy}
        aria-label={"Excluir cobrança " + charge.label}
        className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[var(--status-critical)] hover:bg-[var(--status-critical-bg)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Excluir
      </button>
    </div>
  );
}

function ExpenseActions({
  expense,
  busy,
  onEdit,
  onDelete,
}: {
  expense: FinanceExpense;
  busy: boolean;
  onEdit: (expense: FinanceExpense) => void;
  onDelete: (expense: FinanceExpense) => void;
}) {
  const isPayrollExpense = expense.category === "equipe";
  const isArchivedPayroll = isPayrollExpense && !expense.caregiver_schedule_entry_id;
  return (
    <div className="flex items-center justify-end gap-1">
      {!isArchivedPayroll && (
        <button
          type="button"
          onClick={() => onEdit(expense)}
          disabled={busy}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
        >
          {isPayrollExpense ? "Editar plantão" : "Editar"}
        </button>
      )}
      {isArchivedPayroll && <span className="px-2 text-xs text-[var(--muted)]">Histórico pago</span>}
      {!isPayrollExpense && (
        <button
          type="button"
          onClick={() => onDelete(expense)}
          disabled={busy}
          aria-label={"Excluir despesa " + expense.description}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[var(--status-critical)] hover:bg-[var(--status-critical-bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Excluir
        </button>
      )}
    </div>
  );
}

export function FinanceDashboard({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [snapshot, setSnapshot] = useState(() => emptyFinanceSnapshot(initialMonth));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSnapshot = useCallback(async (selectedMonth: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(
        "/api/admin/finance?month=" + encodeURIComponent(selectedMonth),
        { cache: "no-store", signal },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Não foi possível carregar o financeiro.");
      }
      setLoadError("");
      setSnapshot(payload as FinanceDashboardSnapshot);
      return true;
    } catch (error) {
      if (signal?.aborted) return false;
      setSnapshot(emptyFinanceSnapshot(selectedMonth));
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o financeiro.");
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = window.setTimeout(() => {
      void loadSnapshot(month, controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(refresh);
      controller.abort();
    };
  }, [loadSnapshot, month]);

  const monthFlow = useMemo<FinanceCashFlowPoint>(
    () =>
      snapshot.cash_flow.find((point) => point.month === month) || {
        month,
        received_cents: 0,
        paid_cents: 0,
      },
    [month, snapshot.cash_flow],
  );
  const chartData = useMemo(
    () =>
      snapshot.cash_flow.map((point) => ({
        ...point,
        month_label: formatMonth(point.month, "short"),
        result_cents: point.received_cents - point.paid_cents,
      })),
    [snapshot.cash_flow],
  );
  const chargedCents = snapshot.charges.reduce((total, charge) => total + charge.amount_cents, 0);
  const expenseCents = snapshot.expenses.reduce((total, expense) => total + expense.amount_cents, 0);
  const managerialResultCents = chargedCents - expenseCents;
  const chartTotals = snapshot.cash_flow.reduce(
    (total, point) => ({
      received: total.received + point.received_cents,
      paid: total.paid + point.paid_cents,
    }),
    { received: 0, paid: 0 },
  );
  const resultCents = monthFlow.received_cents - monthFlow.paid_cents;
  const hasCashMovements = chartTotals.received > 0 || chartTotals.paid > 0;
  const payrollSummary = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; shifts: number; totalCents: number; paidCents: number }>();
    for (const expense of snapshot.expenses) {
      if (expense.category !== "equipe") continue;
      const key = expense.caregiver_user_id || expense.payee || "cuidador-sem-nome";
      const group = groups.get(key) || {
        key,
        name: expense.payee || "Cuidador",
        shifts: 0,
        totalCents: 0,
        paidCents: 0,
      };
      group.shifts += 1;
      group.totalCents += expense.amount_cents;
      if (expense.paid_on) group.paidCents += expense.amount_cents;
      groups.set(key, group);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, openCents: group.totalCents - group.paidCents }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [snapshot.expenses]);

  function openDialog(nextDialog: DialogState) {
    setDialogError("");
    setActionError("");
    setNotice("");
    setDialog(nextDialog);
  }

  async function submitDialog(formData: FormData) {
    if (!dialog) return;
    setSaving(true);
    setDialogError("");
    setActionError("");

    let action = "";
    let payload: Record<string, string> = {};
    if (dialog.kind === "charge") {
      action = dialog.record ? "update_charge" : "create_charge";
      payload = {
        action,
        label: String(formData.get("label") || ""),
        competence_month: String(formData.get("competence_month") || ""),
        due_date: String(formData.get("due_date") || ""),
        amount: String(formData.get("amount") || ""),
      };
      if (dialog.record) payload.id = dialog.record.id;
    } else if (dialog.kind === "expense") {
      if (dialog.record?.category === "equipe") {
        action = "update_payroll_expense";
        payload = {
          action,
          id: dialog.record.id,
          amount: String(formData.get("amount") || ""),
          paid_on: String(formData.get("paid_on") || ""),
        };
      } else {
        action = dialog.record ? "update_expense" : "create_expense";
        payload = {
          action,
          expense_date: String(formData.get("expense_date") || ""),
          category: String(formData.get("category") || ""),
          description: String(formData.get("description") || ""),
          amount: String(formData.get("amount") || ""),
          paid_on: String(formData.get("paid_on") || ""),
        };
        if (dialog.record) payload.id = dialog.record.id;
      }
    } else {
      action = "record_receipt";
      payload = {
        action,
        charge_id: dialog.charge.id,
        received_on: String(formData.get("received_on") || ""),
        amount: String(formData.get("amount") || ""),
      };
    }

    try {
      const response = await fetch("/api/admin/finance", {
        method: dialog.kind !== "receipt" && dialog.record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof result?.error === "string" ? result.error : "Não foi possível salvar o lançamento.");
      }
      const successText =
        dialog.kind === "receipt"
          ? "Recebimento registrado."
          : dialog.kind === "charge"
            ? dialog.record
              ? "Cobrança atualizada."
              : "Cobrança adicionada."
            : dialog.record?.category === "equipe"
              ? "Plantão atualizado."
              : dialog.record
                ? "Despesa atualizada."
                : "Despesa adicionada.";
      setDialog(null);
      setNotice(successText);
      await loadSnapshot(month);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Não foi possível salvar o lançamento.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCharge(charge: FinanceCharge) {
    const confirmed = window.confirm(
      "Excluir esta cobrança? Os recebimentos registrados nela também serão apagados.",
    );
    if (!confirmed) return;
    setBusyId(charge.id);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(
        "/api/admin/finance?entity=charge&id=" + encodeURIComponent(charge.id),
        { method: "DELETE" },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir a cobrança.");
      setNotice("Cobrança excluída.");
      await loadSnapshot(month);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir a cobrança.");
    } finally {
      setBusyId("");
    }
  }

  async function removeExpense(expense: FinanceExpense) {
    const confirmed = window.confirm("Excluir esta despesa?");
    if (!confirmed) return;
    setBusyId(expense.id);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(
        "/api/admin/finance?entity=expense&id=" + encodeURIComponent(expense.id),
        { method: "DELETE" },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir a despesa.");
      setNotice("Despesa excluída.");
      await loadSnapshot(month);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir a despesa.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl" aria-busy={loading}>
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
            Vellora / operação
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
            Financeiro
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Acompanhe cobranças, despesas e o resultado financeiro por competência.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="finance-month" className={LABEL_CLASS}>Competência</label>
            <input
              id="finance-month"
              type="month"
              value={month}
              onChange={(event) => {
                setLoading(true);
                setLoadError("");
                setNotice("");
                setActionError("");
                setMonth(event.target.value);
              }}
              className={INPUT_CLASS + " min-w-48"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => openDialog({ kind: "charge" })} className="min-h-11">
              <span aria-hidden="true">＋</span> Nova cobrança
            </Button>
            <Button type="button" onClick={() => openDialog({ kind: "expense" })} className="min-h-11">
              <span aria-hidden="true">＋</span> Nova despesa
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-5 min-h-6" aria-live="polite">
        {loading && (
          <p role="status" className="text-sm text-[var(--muted)]">Carregando lançamentos financeiros…</p>
        )}
        {notice && !loading && (
          <p role="status" className="text-sm font-medium text-[var(--status-good)]">{notice}</p>
        )}
        {loadError && (
          <p role="alert" className="rounded-xl border border-[var(--status-warning)]/30 bg-[var(--status-warning-bg)] px-4 py-3 text-sm leading-5 text-[var(--foreground)]">
            {loadError}
          </p>
        )}
        {actionError && (
          <p role="alert" className="rounded-xl border border-[var(--status-critical)]/25 bg-[var(--status-critical-bg)] px-4 py-3 text-sm leading-5 text-[var(--status-critical)]">
            {actionError}
          </p>
        )}
      </div>

      <section aria-labelledby="finance-metrics-title">
        <h3 id="finance-metrics-title" className="sr-only">Resumo financeiro de {formatMonth(month)}</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="A receber"
            value={totalChargeBalance(snapshot.charges)}
            helper="Saldo das cobranças desta competência"
          />
          <MetricCard
            label="Entradas recebidas"
            value={monthFlow.received_cents}
            helper={"Recebimentos registrados em " + formatMonth(month)}
          />
          <MetricCard
            label="Despesas pagas"
            value={monthFlow.paid_cents}
            helper={"Pagamentos registrados em " + formatMonth(month)}
          />
          <MetricCard
            label="Resultado financeiro"
            value={resultCents}
            helper="Entradas recebidas menos despesas pagas"
            negative={resultCents < 0}
          />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="finance-chart-title">
        <Card className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 id="finance-chart-title" className="text-lg font-semibold text-[var(--foreground)]">
                Entradas, saídas e resultado
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Visão mensal das liquidações nos seis meses até {formatMonth(month)}.
              </p>
            </div>
            <span className="self-start rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">
              Por mês
            </span>
          </div>

          <div
            className="mt-4 h-72 min-w-0 sm:h-80"
            role="img"
            aria-label="Gráfico mensal de entradas, saídas e resultado financeiro"
            aria-describedby="finance-chart-summary"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 2, bottom: 0 }}>
                <CartesianGrid stroke="#e4ebe9" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month_label"
                  tick={{ fontSize: 11, fill: "#58706b" }}
                  axisLine={{ stroke: "#e4ebe9" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatAxisCurrency(Number(value))}
                  tick={{ fontSize: 11, fill: "#58706b" }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e4ebe9", fontSize: 12 }}
                  cursor={{ fill: "rgba(36, 103, 95, 0.06)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="received_cents" name="Entradas" fill={CHART_GREEN} radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="paid_cents" name="Saídas" fill={CHART_RED} radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Line
                  dataKey="result_cents"
                  name="Resultado"
                  type="monotone"
                  stroke={CHART_LINE}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_LINE }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p id="finance-chart-summary" className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {hasCashMovements
              ? "No período: entradas de " +
                formatCurrency(chartTotals.received) +
                ", saídas de " +
                formatCurrency(chartTotals.paid) +
                " e resultado de " +
                formatCurrency(chartTotals.received - chartTotals.paid) +
                "."
              : "Sem movimentações liquidadas neste período. O gráfico considera a data de cada recebimento e pagamento."}
          </p>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="finance-charges-title">
        <Card className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 id="finance-charges-title" className="text-lg font-semibold text-[var(--foreground)]">
                Cobranças
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Controle os valores a receber. Registre recebimentos totais ou parciais para atualizar o saldo e o gráfico.
              </p>
            </div>
            <Button type="button" onClick={() => openDialog({ kind: "charge" })} className="min-h-11 self-start lg:self-auto">
              <span aria-hidden="true">＋</span> Nova cobrança
            </Button>
          </div>

          {snapshot.charges.length > 0 ? (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-xl border border-[var(--border)] sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse">
                    <caption className="sr-only">Cobranças da competência {formatMonth(month)}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Vencimento</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Cliente / contrato</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Valor</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Recebido</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Situação</th>
                        <th scope="col" className={TABLE_HEAD_CLASS + " text-right"}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.charges.map((charge) => {
                        const status = getChargeStatus(charge);
                        return (
                          <tr key={charge.id} className="hover:bg-[var(--surface-soft)]/70">
                            <td className={TABLE_CELL_CLASS + " whitespace-nowrap font-semibold tabular-nums"}>
                              {formatDate(charge.due_date)}
                            </td>
                            <td className={TABLE_CELL_CLASS + " max-w-[20rem] break-words font-medium"}>
                              {charge.label}
                            </td>
                            <td className={TABLE_CELL_CLASS + " whitespace-nowrap tabular-nums"}>
                              {formatCurrency(charge.amount_cents)}
                            </td>
                            <td className={TABLE_CELL_CLASS + " whitespace-nowrap tabular-nums"}>
                              {formatCurrency(charge.received_cents)}
                            </td>
                            <td className={TABLE_CELL_CLASS}>
                              <span className={"inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold " + status.className}>
                                {status.label}
                              </span>
                            </td>
                            <td className={TABLE_CELL_CLASS + " text-right"}>
                              <ChargeActions
                                charge={charge}
                                busy={busyId === charge.id}
                                onReceive={(item) => openDialog({ kind: "receipt", charge: item })}
                                onEdit={(item) => openDialog({ kind: "charge", record: item })}
                                onDelete={removeCharge}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 space-y-3 sm:hidden">
                {snapshot.charges.map((charge) => {
                  const status = getChargeStatus(charge);
                  const openCents = Math.max(0, charge.amount_cents - charge.received_cents);
                  return (
                    <details key={charge.id} className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)] [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={"inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold " + status.className}>
                              {status.label}
                            </span>
                            <span className="text-xs text-[var(--muted)]">Vence em {formatDate(charge.due_date)}</span>
                          </div>
                          <p className="mt-2 break-words text-sm font-semibold text-[var(--foreground)]">{charge.label}</p>
                          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">{formatCurrency(charge.amount_cents)}</p>
                        </div>
                        <span aria-hidden="true" className="shrink-0 text-lg text-[var(--muted)] transition-transform group-open:rotate-180">⌄</span>
                      </summary>
                      <div className="border-t border-[var(--border)] px-4 pb-3 pt-2">
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 py-2 text-sm">
                          <div>
                            <dt className="text-xs text-[var(--muted)]">Valor</dt>
                            <dd className="mt-1 font-medium tabular-nums text-[var(--foreground)]">{formatCurrency(charge.amount_cents)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[var(--muted)]">Recebido</dt>
                            <dd className="mt-1 font-medium tabular-nums text-[var(--foreground)]">{formatCurrency(charge.received_cents)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[var(--muted)]">Em aberto</dt>
                            <dd className="mt-1 font-medium tabular-nums text-[var(--foreground)]">{formatCurrency(openCents)}</dd>
                          </div>
                        </dl>
                        <div className="-mx-2 border-t border-[var(--border)] pt-1">
                          <ChargeActions
                            charge={charge}
                            busy={busyId === charge.id}
                            onReceive={(item) => openDialog({ kind: "receipt", charge: item })}
                            onEdit={(item) => openDialog({ kind: "charge", record: item })}
                            onDelete={removeCharge}
                          />
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-8 text-center">
              <p className="font-semibold text-[var(--foreground)]">Nenhuma cobrança nesta competência</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Cadastre uma cobrança para acompanhar vencimento e recebimentos.</p>
              <Button type="button" variant="secondary" onClick={() => openDialog({ kind: "charge" })} className="mt-4 min-h-11">
                Adicionar cobrança
              </Button>
            </div>
          )}
          <p className="mt-3 text-sm text-[var(--muted)]">
            Total lançado: <strong className="font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(chargedCents)}</strong>
            <span className="px-2" aria-hidden="true">·</span>
            Em aberto: <strong className="font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(totalChargeBalance(snapshot.charges))}</strong>
          </p>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="finance-expenses-title">
        <Card className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 id="finance-expenses-title" className="text-lg font-semibold text-[var(--foreground)]">
                Despesas
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Acompanhe os gastos da operação e os plantões calculados automaticamente pela escala.
              </p>
            </div>
            <Button type="button" onClick={() => openDialog({ kind: "expense" })} className="min-h-11 self-start lg:self-auto">
              <span aria-hidden="true">＋</span> Nova despesa
            </Button>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-semibold text-[var(--foreground)]">Pagamentos da equipe</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">Resumo dos plantões desta competência por cuidador.</p>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Em aberto: <strong className="font-semibold tabular-nums text-[var(--foreground)]">
                  {formatCurrency(payrollSummary.reduce((total, caregiver) => total + caregiver.openCents, 0))}
                </strong>
              </p>
            </div>
            {payrollSummary.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {payrollSummary.map((caregiver) => (
                  <div key={caregiver.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-semibold text-[var(--foreground)]">{caregiver.name}</p>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {caregiver.shifts} {caregiver.shifts === 1 ? "plantão" : "plantões"}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--muted)]">Total</dt>
                        <dd className="font-medium tabular-nums text-[var(--foreground)]">{formatCurrency(caregiver.totalCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--muted)]">Pago</dt>
                        <dd className="font-medium tabular-nums text-[var(--foreground)]">{formatCurrency(caregiver.paidCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2">
                        <dt className="font-semibold text-[var(--brand-dark)]">A pagar</dt>
                        <dd className="font-semibold tabular-nums text-[var(--brand-dark)]">{formatCurrency(caregiver.openCents)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[var(--surface)] px-4 py-3 text-sm leading-5 text-[var(--muted)]">
                Os valores serão calculados quando houver plantões na escala e remuneração cadastrada no perfil dos cuidadores.
              </p>
            )}
          </div>

          {snapshot.expenses.length > 0 ? (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-xl border border-[var(--border)] sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <caption className="sr-only">Despesas da competência {formatMonth(month)}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Data</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Categoria</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Descrição</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Valor</th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>Pago em</th>
                        <th scope="col" className={TABLE_HEAD_CLASS + " text-right"}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-[var(--surface-soft)]/70">
                          <td className={TABLE_CELL_CLASS + " whitespace-nowrap font-semibold tabular-nums"}>
                            {formatDate(expense.expense_date)}
                          </td>
                          <td className={TABLE_CELL_CLASS + " whitespace-nowrap"}>{categoryLabel(expense.category)}</td>
                          <td className={TABLE_CELL_CLASS + " max-w-[18rem] break-words"}>{expense.description}</td>
                          <td className={TABLE_CELL_CLASS + " whitespace-nowrap tabular-nums"}>
                            {formatCurrency(expense.amount_cents)}
                          </td>
                          <td className={TABLE_CELL_CLASS + " whitespace-nowrap"}>
                            {expense.paid_on ? (
                              formatDate(expense.paid_on)
                            ) : (
                              <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--status-warning-bg)] px-3 text-xs font-semibold text-[var(--status-warning)]">
                                Em aberto
                              </span>
                            )}
                          </td>
                          <td className={TABLE_CELL_CLASS + " text-right"}>
                            <ExpenseActions
                              expense={expense}
                              busy={busyId === expense.id}
                              onEdit={(item) => openDialog({ kind: "expense", record: item })}
                              onDelete={removeExpense}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 space-y-3 sm:hidden">
                {snapshot.expenses.map((expense) => (
                  <details key={expense.id} className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)] [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--surface-soft)] px-3 text-xs font-semibold text-[var(--muted)]">
                            {categoryLabel(expense.category)}
                          </span>
                          {expense.paid_on ? (
                            <span className="text-xs text-[var(--muted)]">Pago</span>
                          ) : (
                            <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--status-warning-bg)] px-3 text-xs font-semibold text-[var(--status-warning)]">
                              Em aberto
                            </span>
                          )}
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold text-[var(--foreground)]">{expense.description}</p>
                        <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">{formatCurrency(expense.amount_cents)}</p>
                      </div>
                      <span aria-hidden="true" className="shrink-0 text-lg text-[var(--muted)] transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    <div className="border-t border-[var(--border)] px-4 pb-3 pt-2">
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 py-2 text-sm">
                        <div>
                          <dt className="text-xs text-[var(--muted)]">Data</dt>
                          <dd className="mt-1 font-medium tabular-nums text-[var(--foreground)]">{formatDate(expense.expense_date)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--muted)]">Pago em</dt>
                          <dd className="mt-1 font-medium tabular-nums text-[var(--foreground)]">{formatDate(expense.paid_on)}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-[var(--muted)]">Categoria</dt>
                          <dd className="mt-1 font-medium text-[var(--foreground)]">{categoryLabel(expense.category)}</dd>
                        </div>
                      </dl>
                      <div className="-mx-2 border-t border-[var(--border)] pt-1">
                        <ExpenseActions
                          expense={expense}
                          busy={busyId === expense.id}
                          onEdit={(item) => openDialog({ kind: "expense", record: item })}
                          onDelete={removeExpense}
                        />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-8 text-center">
              <p className="font-semibold text-[var(--foreground)]">Nenhuma despesa nesta competência</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Cadastre as despesas para acompanhar valores e datas de pagamento.</p>
              <Button type="button" variant="secondary" onClick={() => openDialog({ kind: "expense" })} className="mt-4 min-h-11">
                Adicionar despesa
              </Button>
            </div>
          )}
          <p className="mt-3 text-sm text-[var(--muted)]">
            Total lançado: <strong className="font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(expenseCents)}</strong>
          </p>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="finance-result-title">
        <Card>
          <h3 id="finance-result-title" className="text-lg font-semibold text-[var(--foreground)]">
            Resultado de {formatMonth(month)}
          </h3>
          <dl className="mt-4 max-w-2xl divide-y divide-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <dt className="text-sm text-[var(--muted)]">Faturamento lançado</dt>
              <dd className="font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(chargedCents)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <dt className="text-sm text-[var(--muted)]">Despesas lançadas</dt>
              <dd className="font-semibold tabular-nums text-[var(--foreground)]">−{formatCurrency(expenseCents)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <dt className="font-semibold text-[var(--brand-dark)]">Resultado gerencial</dt>
              <dd className={"text-lg font-semibold tabular-nums " + (managerialResultCents < 0 ? "text-[var(--status-critical)]" : "text-[var(--brand-dark)]")}>
                {formatCurrency(managerialResultCents)}
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 py-3">
              <dt className="text-sm text-[var(--muted)]">Entradas recebidas</dt>
              <dd className="font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(monthFlow.received_cents)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <dt className="text-sm text-[var(--muted)]">Despesas pagas</dt>
              <dd className="font-semibold tabular-nums text-[var(--foreground)]">−{formatCurrency(monthFlow.paid_cents)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <dt className="font-semibold text-[var(--brand-dark)]">Resultado de caixa</dt>
              <dd className={"text-lg font-semibold tabular-nums " + (resultCents < 0 ? "text-[var(--status-critical)]" : "text-[var(--brand-dark)]")}>
                {formatCurrency(resultCents)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            O resultado gerencial considera cobranças e despesas lançadas na competência; plantões entram automaticamente como despesas de equipe. O resultado de caixa considera recebimentos e pagamentos efetivos.
          </p>
        </Card>
      </section>

      <FinanceDialog
        key={
          dialog
            ? dialog.kind === "receipt"
              ? dialog.kind + dialog.charge.id
              : dialog.kind + (dialog.record?.id || "new")
            : "closed"
        }
        dialog={dialog}
        month={month}
        busy={saving}
        error={dialogError}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
        onSubmit={(formData) => void submitDialog(formData)}
      />
    </div>
  );
}
