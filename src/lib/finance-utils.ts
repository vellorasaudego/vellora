import type {
  FinanceCashFlowPoint,
  FinanceDashboardSnapshot,
  FinanceExpense,
  FinanceExpensePaymentMovement,
  FinanceReceiptMovement,
} from "./data";

export function shiftFinanceMonth(month: string, offset: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Competência inválida.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function financeChartRange(month: string): { start: string; end: string } {
  return {
    start: `${shiftFinanceMonth(month, -5)}-01`,
    end: `${shiftFinanceMonth(month, 1)}-01`,
  };
}

export function buildFinanceCashFlow(
  month: string,
  receipts: FinanceReceiptMovement[],
  payments: FinanceExpensePaymentMovement[],
): FinanceCashFlowPoint[] {
  const points = new Map<string, FinanceCashFlowPoint>();
  for (let offset = -5; offset <= 0; offset += 1) {
    const key = shiftFinanceMonth(month, offset);
    points.set(key, { month: key, received_cents: 0, paid_cents: 0 });
  }

  for (const receipt of receipts) {
    const point = points.get(receipt.received_on.slice(0, 7));
    if (point) point.received_cents += receipt.amount_cents;
  }
  for (const payment of payments) {
    const point = points.get(payment.paid_on.slice(0, 7));
    if (point) point.paid_cents += payment.amount_cents;
  }

  return [...points.values()];
}

export function emptyFinanceSnapshot(month: string): FinanceDashboardSnapshot {
  return {
    month,
    charges: [],
    expenses: [],
    cash_flow: buildFinanceCashFlow(month, [], []),
  };
}

export function totalChargeBalance(
  charges: Array<{ amount_cents: number; received_cents: number }>,
): number {
  return charges.reduce(
    (total, charge) => total + Math.max(0, charge.amount_cents - charge.received_cents),
    0,
  );
}

export function getFinanceExpenseStatus(expense: FinanceExpense): "pago" | "em_aberto" {
  return expense.paid_on ? "pago" : "em_aberto";
}
