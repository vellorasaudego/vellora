import { describe, expect, it } from "vitest";
import { statusBP, statusGlucose, statusHeartRate, statusSpo2, statusTemperature, worstStatus } from "../src/lib/vitals";

describe("sinalização visual dos sinais vitais", () => {
  it("classifica faixas críticas e de atenção", () => {
    expect(statusBP(185, 90)).toBe("critical");
    expect(statusHeartRate(105)).toBe("warning");
    expect(statusTemperature(39)).toBe("critical");
    expect(statusSpo2(93)).toBe("warning");
    expect(statusGlucose(260)).toBe("critical");
  });

  it("retorna o pior status do conjunto", () => {
    expect(worstStatus("good", "warning", "good")).toBe("warning");
    expect(worstStatus("warning", "critical", "good")).toBe("critical");
  });
});
