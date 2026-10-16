import { PricingCalculator } from "@/components/admin/PricingCalculator";

function currentMonthInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || "";
  return part("year") + "-" + part("month");
}

export default function AdminPricingPage() {
  return <PricingCalculator initialMonth={currentMonthInSaoPaulo()} />;
}
