import { describe, expect, it } from "vitest";
import {
  biggestDrops,
  linearRegression,
  projectCumulative,
  variation,
} from "./analytics";

describe("linearRegression", () => {
  it("ajusta uma reta perfeita y=2x+1", () => {
    const r = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(1);
  });
  it("um ponto → slope 0", () => {
    expect(linearRegression([{ x: 5, y: 9 }])).toEqual({ slope: 0, intercept: 9 });
  });
});

describe("projectCumulative", () => {
  it("projeta crescimento linear", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];
    const p = projectCumulative(pts, 7);
    expect(p.predicted).toBeGreaterThanOrEqual(30);
    expect(p.predicted).toBeCloseTo(100, -1); // ~10/dia * 10 dias
    expect(p.min).toBeLessThanOrEqual(p.predicted);
    expect(p.max).toBeGreaterThanOrEqual(p.predicted);
  });
  it("nunca projeta abaixo do acumulado atual", () => {
    const p = projectCumulative(
      [
        { x: 0, y: 100 },
        { x: 1, y: 100 },
      ],
      30,
    );
    expect(p.predicted).toBeGreaterThanOrEqual(100);
  });
});

describe("biggestDrops", () => {
  it("acha as duas maiores quedas", () => {
    // 100 no bucket 0, cai para 50 no 10, e para 10 no 50
    const buckets = [
      { bucket: 0, viewers: 100 },
      { bucket: 10, viewers: 50 },
      { bucket: 50, viewers: 10 },
    ];
    // expande: 0..9 = 100? não — nossa expansão põe 0 onde não há bucket.
    const drops = biggestDrops(buckets, 300, 2);
    expect(drops).toHaveLength(2);
    expect(drops[0]!.dropPct).toBeGreaterThan(drops[1]!.dropPct);
    expect(drops[0]!.atSec).toBeGreaterThan(0);
  });
  it("sem dados → vazio", () => {
    expect(biggestDrops([], 300)).toEqual([]);
  });
});

describe("variation", () => {
  it("calcula variação", () => {
    expect(variation(150, 100)).toBeCloseTo(0.5);
  });
  it("base zero → null (sem comparação)", () => {
    expect(variation(10, 0)).toBeNull();
  });
});
