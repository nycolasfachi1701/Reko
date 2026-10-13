import { describe, expect, it } from "vitest";
import { buildCertificatePdf } from "./certificate";

describe("certificate", () => {
  it("gera um PDF válido", async () => {
    const pdf = await buildCertificatePdf({
      userName: "Maria Silva",
      trackTitle: "Onboarding",
      completedAt: new Date("2026-10-01T12:00:00Z"),
      videoCount: 3,
    });
    expect(pdf.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(pdf[0]!, pdf[1]!, pdf[2]!, pdf[3]!)).toBe("%PDF");
  });

  it("não quebra com caracteres fora do Latin-1 (emoji/CJK)", async () => {
    const pdf = await buildCertificatePdf({
      userName: "名前 🎉 Łukasz",
      trackTitle: "Trilha ✓ 😀 cañón",
      completedAt: new Date("2026-10-01T12:00:00Z"),
      videoCount: 1,
    });
    expect(String.fromCharCode(pdf[0]!, pdf[1]!, pdf[2]!, pdf[3]!)).toBe("%PDF");
  });
});
