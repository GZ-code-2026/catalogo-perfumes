import { describe, expect, it } from "vitest";
import { lerOrcamento } from "./budget";

describe("lerOrcamento", () => {
  it("usa 18 se faltar, estiver vazio ou não for número", () => {
    expect(lerOrcamento(undefined)).toBe(18);
    expect(lerOrcamento("")).toBe(18);
    expect(lerOrcamento("  ")).toBe(18);
    expect(lerOrcamento("abc")).toBe(18);
    expect(lerOrcamento("Infinity")).toBe(18);
  });
  it("usa o valor numérico", () => {
    expect(lerOrcamento("5")).toBe(5);
    expect(lerOrcamento("0")).toBe(0);
  });
});
