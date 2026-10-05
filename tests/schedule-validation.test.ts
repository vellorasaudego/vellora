import { describe, expect, it } from "vitest";
import { scheduleIntervalsOverlap, shiftScheduleDate } from "@/lib/schedule-validation";
import {
  isScheduleOverlapConflictError,
  ScheduleOverlapConflictError,
} from "@/lib/schedule-errors";

describe("scheduleIntervalsOverlap", () => {
  it("detecta conflito entre um plantão noturno e o próximo dia", () => {
    expect(scheduleIntervalsOverlap(
      { scheduled_date: "2026-10-01", start_time: "22:00", end_time: "02:00", ends_next_day: true },
      { scheduled_date: "2026-10-02", start_time: "01:00", end_time: "04:00", ends_next_day: false },
    )).toBe(true);
  });

  it("permite plantões consecutivos que apenas encostam no horário", () => {
    expect(scheduleIntervalsOverlap(
      { scheduled_date: "2026-10-01", start_time: "08:00", end_time: "12:00", ends_next_day: false },
      { scheduled_date: "2026-10-01", start_time: "12:00", end_time: "20:00", ends_next_day: false },
    )).toBe(false);
  });

  it("calcula corretamente a janela de consulta incluindo o dia anterior", () => {
    expect(shiftScheduleDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftScheduleDate("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("isScheduleOverlapConflictError", () => {
  it("recognizes conflicts from the application, Postgres, and SQLite", () => {
    expect(isScheduleOverlapConflictError(new ScheduleOverlapConflictError())).toBe(true);
    expect(isScheduleOverlapConflictError({ code: "23P01", message: "exclusion violation" })).toBe(true);
    expect(isScheduleOverlapConflictError(new Error("SCHEDULE_OVERLAP_CONFLICT"))).toBe(true);
  });

  it("does not classify unrelated persistence failures as schedule conflicts", () => {
    expect(isScheduleOverlapConflictError(new Error("network unavailable"))).toBe(false);
  });
});
