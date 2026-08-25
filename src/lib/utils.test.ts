import { describe, expect, it } from "vitest";
import { cn, formatDuration } from "./utils";

describe("cn", () => {
  it("junta classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolve conflitos do tailwind (a última vence)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("respeita condicionais", () => {
    expect(cn("base", false && "off", "on")).toBe("base on");
  });
});

describe("formatDuration", () => {
  it("formata minutos e segundos", () => {
    expect(formatDuration(312)).toBe("5:12");
  });

  it("preenche segundos com zero", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("inclui horas quando passa de 1h", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("nunca retorna negativo", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});
