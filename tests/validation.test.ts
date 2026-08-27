import { describe, expect, it } from "vitest";
import { isValidEmail, isValidIsoDate, isValidTime, normalizedPhoneDigits, parseOptionalNumber } from "../src/lib/validation";

describe("validações de entrada", () => {
  it("aceita e-mails e telefones em formatos plausíveis", () => {
    expect(isValidEmail("familia@example.com")).toBe(true);
    expect(isValidEmail("familia@example")).toBe(false);
    expect(normalizedPhoneDigits("(62) 9 8135-5553")).toBe("62981355553");
  });

  it("valida datas reais e horários no formato da aplicação", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("aplica limites e inteiros aos sinais vitais", () => {
    expect(parseOptionalNumber("97", { min: 50, max: 100, integer: true })).toEqual({ valid: true, value: 97 });
    expect(parseOptionalNumber("97.5", { min: 50, max: 100, integer: true }).valid).toBe(false);
    expect(parseOptionalNumber("", { min: 50, max: 100, integer: true })).toEqual({ valid: true, value: null });
    expect(parseOptionalNumber("700", { min: 30, max: 600, integer: true }).valid).toBe(false);
  });
});
