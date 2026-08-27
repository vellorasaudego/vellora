// Faixas de referência simplificadas para adultos idosos, usadas apenas para
// sinalização visual no protótipo. Não substituem avaliação clínica.
export type VitalStatus = "good" | "warning" | "critical";

export function statusBP(systolic?: number | null, diastolic?: number | null): VitalStatus {
  if (systolic == null || diastolic == null) return "good";
  if (systolic >= 180 || diastolic >= 110 || systolic < 90 || diastolic < 55) return "critical";
  if (systolic >= 140 || diastolic >= 90 || systolic < 100) return "warning";
  return "good";
}

export function statusHeartRate(hr?: number | null): VitalStatus {
  if (hr == null) return "good";
  if (hr < 45 || hr > 130) return "critical";
  if (hr < 55 || hr > 100) return "warning";
  return "good";
}

export function statusTemperature(temp?: number | null): VitalStatus {
  if (temp == null) return "good";
  if (temp >= 39 || temp < 35) return "critical";
  if (temp >= 37.8 || temp < 35.8) return "warning";
  return "good";
}

export function statusSpo2(spo2?: number | null): VitalStatus {
  if (spo2 == null) return "good";
  if (spo2 < 90) return "critical";
  if (spo2 < 95) return "warning";
  return "good";
}

export function statusGlucose(glucose?: number | null): VitalStatus {
  if (glucose == null) return "good";
  if (glucose >= 250 || glucose < 60) return "critical";
  if (glucose >= 180 || glucose < 70) return "warning";
  return "good";
}

export function worstStatus(...statuses: VitalStatus[]): VitalStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "good";
}

export const STATUS_LABEL: Record<VitalStatus, string> = {
  good: "Normal",
  warning: "Atenção",
  critical: "Crítico",
};

// Cores do status palette (ver skill de dataviz) — fixas, nunca reaproveitadas
// para identidade de série.
export const STATUS_COLOR: Record<VitalStatus, { text: string; bg: string; ring: string }> = {
  good: { text: "#0ca30c", bg: "#e9f7e9", ring: "rgba(12,163,12,0.25)" },
  warning: { text: "#ad7900", bg: "#fef3dc", ring: "rgba(250,178,25,0.35)" },
  critical: { text: "#d03b3b", bg: "#fbe9e9", ring: "rgba(208,59,59,0.3)" },
};
