import { describe, expect, it } from "vitest";
import type { ChangeEvent } from "react";
import { handleCarePlanTimeChange } from "../src/components/admin/CarePlanField";
import {
  CARE_PLAN_OPTIONS,
  CUSTOM_CARE_PLAN_OPTION,
  DAYTIME_CARE_PLAN,
  formatDuration,
  NIGHTTIME_CARE_PLAN,
  parseCarePlanValue,
  resolveCarePlanInitialState,
  serializeCustomCarePlan,
  validateCustomCarePlanSchedule,
  calculateCustomDuration,
} from "../src/components/admin/care-plan";

describe("care plans", () => {
  it("exposes exactly the four supported plan options", () => {
    expect(CARE_PLAN_OPTIONS.map((option) => option.label)).toEqual([
      "Período diurno 12h/dia",
      "Período noturno 12h/dia",
      "24 horas",
      "Personalizado",
    ]);
    expect(CARE_PLAN_OPTIONS.map((option) => option.value)).toContain(CUSTOM_CARE_PLAN_OPTION);
  });

  it("calculates a same-day interval in hours and minutes", () => {
    expect(calculateCustomDuration("08:30", "17:15")).toBe(525);
    expect(formatDuration(525)).toBe("8 horas e 45 minutos");
  });

  it("calculates an interval that crosses midnight", () => {
    expect(calculateCustomDuration("22:00", "06:30")).toBe(510);
    expect(formatDuration(510)).toBe("8 horas e 30 minutos");
  });

  it("captures the time value before the functional updater runs", () => {
    let updater: ((current: { start: string; end: string }) => { start: string; end: string }) | undefined;
    const setDraftSchedule = (nextUpdater: (current: { start: string; end: string }) => { start: string; end: string }) => {
      updater = nextUpdater;
    };
    const event = { currentTarget: { value: "22:30" } } as { currentTarget: { value: string } | null };

    handleCarePlanTimeChange(setDraftSchedule, "start", event as unknown as ChangeEvent<HTMLInputElement>);
    event.currentTarget = null;

    expect(updater).toBeTypeOf("function");
    expect(updater!({ start: "08:00", end: "17:00" })).toEqual({ start: "22:30", end: "17:00" });
  });

  it("rejects missing, malformed and equal times", () => {
    expect(validateCustomCarePlanSchedule("", "").valid).toBe(false);
    expect(validateCustomCarePlanSchedule("25:00", "06:00").valid).toBe(false);
    expect(validateCustomCarePlanSchedule("08:00", "08:00")).toEqual({
      valid: false,
      message: "A hora de fim deve ser diferente da hora de início.",
      focus: "both",
    });
    expect(calculateCustomDuration("08:00", "08:00")).toBeNull();
  });

  it("serializes and parses custom schedules through care_level", () => {
    const serialized = serializeCustomCarePlan({ start: "22:00", end: "06:30" });
    expect(serialized).toBe("Personalizado (22:00–06:30)");
    expect(parseCarePlanValue(serialized)).toEqual({
      kind: "custom",
      value: serialized,
      schedule: { start: "22:00", end: "06:30" },
    });
  });

  it("keeps an old care_level value selectable when editing", () => {
    const oldValue = "Integral (12h/dia)";
    expect(resolveCarePlanInitialState(oldValue, true)).toEqual({
      selection: "__legacy__",
      storedValue: oldValue,
      customSchedule: null,
      legacyValue: oldValue,
    });
    expect(resolveCarePlanInitialState(oldValue, false).selection).toBe(DAYTIME_CARE_PLAN);
    expect(parseCarePlanValue(NIGHTTIME_CARE_PLAN)).toEqual({ kind: "standard", value: NIGHTTIME_CARE_PLAN });
  });
});
