import { describe, expect, it } from "vitest";
import { generateScheduleRecurrence } from "@/lib/schedule-recurrence";

describe("generateScheduleRecurrence", () => {
  it("gera todos os dias sim e dia não, incluindo a data inicial", () => {
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-05", pattern: "daily" }))
      .toEqual({ dates: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"] });
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-06", pattern: "alternate_days" }))
      .toEqual({ dates: ["2026-10-01", "2026-10-03", "2026-10-05"] });
  });

  it("filtra dias úteis, finais de semana e dias escolhidos", () => {
    const start_date = "2026-10-05";
    const end_date = "2026-10-11";
    expect(generateScheduleRecurrence({ start_date, end_date, pattern: "weekdays" }))
      .toEqual({ dates: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"] });
    expect(generateScheduleRecurrence({ start_date, end_date, pattern: "weekends" }))
      .toEqual({ dates: ["2026-10-10", "2026-10-11"] });
    expect(generateScheduleRecurrence({ start_date, end_date, pattern: "selected_weekdays", weekdays: [1, 3, 5] }))
      .toEqual({ dates: ["2026-10-05", "2026-10-07", "2026-10-09"] });
  });

  it("respeita intervalo N, exceções e datas avulsas", () => {
    expect(generateScheduleRecurrence({
      start_date: "2026-10-01", end_date: "2026-10-07", pattern: "every_n_days", interval_days: 3, skip_dates: ["2026-10-04"],
    })).toEqual({ dates: ["2026-10-01", "2026-10-07"] });
    expect(generateScheduleRecurrence({
      start_date: "2026-10-01", end_date: "2026-10-31", pattern: "custom_dates", dates: ["2026-10-15", "2026-10-02"],
    })).toEqual({ dates: ["2026-10-02", "2026-10-15"] });
  });

  it("repete mensalmente e ajusta dias inexistentes em meses curtos e anos bissextos", () => {
    expect(generateScheduleRecurrence({ start_date: "2024-01-31", end_date: "2024-04-30", pattern: "monthly" }))
      .toEqual({ dates: ["2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30"] });
  });

  it("rejeita períodos inválidos, intervalos excessivos e seleção vazia", () => {
    expect(generateScheduleRecurrence({ start_date: "2026-02-30", end_date: "2026-03-01", pattern: "daily" })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-01-01", end_date: "2027-01-02", pattern: "daily" })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-03", pattern: "every_n_days", interval_days: 0 })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-03", pattern: "selected_weekdays", weekdays: [] })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-03", pattern: "custom_dates", dates: [] })).toHaveProperty("error");
  });

  it("recusa exceções e datas avulsas fora do período, e quando o resultado fica vazio", () => {
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-03", pattern: "daily", skip_dates: ["2026-10-04"] })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-03", pattern: "custom_dates", dates: ["2026-10-04"] })).toHaveProperty("error");
    expect(generateScheduleRecurrence({ start_date: "2026-10-01", end_date: "2026-10-01", pattern: "daily", skip_dates: ["2026-10-01"] })).toHaveProperty("error");
  });
});
