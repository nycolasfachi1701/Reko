import { describe, expect, it } from "vitest";
import { deviceFromUA } from "./device";

describe("deviceFromUA", () => {
  it("iPhone → mobile", () => {
    expect(deviceFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
  });
  it("Android phone → mobile", () => {
    expect(deviceFromUA("Mozilla/5.0 (Linux; Android 14; Pixel)")).toBe("mobile");
  });
  it("iPad → tablet", () => {
    expect(deviceFromUA("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
  });
  it("desktop por padrão", () => {
    expect(deviceFromUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });
  it("sem UA → desktop", () => {
    expect(deviceFromUA(null)).toBe("desktop");
  });
});
