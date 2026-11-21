import { describe, expect, it } from "vitest";
import { classificar, lerOrcamento, variaveisFaltando } from "./seed-logic";

describe("classificar", () => {
  it("foto quando há url", () => {
    expect(classificar("https://x/a.png", null)).toBe("foto");
  });
  it("sem-foto quando o cache diz none", () => {
    expect(classificar(null, { status: "none" })).toBe("sem-foto");
  });
  it("falha quando não há url nem cache", () => {
    expect(classificar(null, null)).toBe("falha");
  });
});

describe("lerOrcamento", () => {
  it("usa 18 se faltar ou não for número", () => {
    expect(lerOrcamento(undefined)).toBe(18);
    expect(lerOrcamento("")).toBe(18);
    expect(lerOrcamento("abc")).toBe(18);
  });
  it("usa o valor numérico", () => {
    expect(lerOrcamento("5")).toBe(5);
  });
});

describe("variaveisFaltando", () => {
  it("lista as que faltam", () => {
    expect(variaveisFaltando({ SUPABASE_URL: "u" })).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY",
      "FRAGELLA_API_KEY",
    ]);
  });
});
