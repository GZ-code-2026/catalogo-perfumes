import { describe, expect, it } from "vitest";
import termosEn from "../../../data/terms-en.json";
import ptTerms from "./pt-terms.json";
import { t, type TermKind } from "./terms";

const FIXOS: Record<string, string[]> = {
  season: ["spring", "summer", "autumn", "winter"],
  occasion: ["daytime", "office", "casual", "evening", "date night", "special occasion"],
  style: [
    "aquatic", "boozy", "clean", "creamy", "dark", "floral", "fresh", "citrusy",
    "fruity", "gourmand", "green", "leathery", "musky", "powdery", "sensual",
    "smoky", "spicy", "sweet", "woody",
  ],
  gender: ["men", "women", "unisex"],
};

describe("t", () => {
  it("traduz estação, gênero e nota", () => {
    expect(t("season", "autumn")).toBe("Outono");
    expect(t("gender", "unisex")).toBe("Unissex");
    expect(t("note", "Bergamot")).toBe("Bergamota");
  });

  it("devolve o original quando não há tradução", () => {
    expect(t("note", "termo-inexistente-xyz")).toBe("termo-inexistente-xyz");
  });

  it("ignora espaços extras e maiúsculas na busca", () => {
    expect(t("occasion", "  Date   Night ")).toBe("Encontro");
  });
});

describe("cobertura", () => {
  const todos: Record<string, string[]> = { ...(termosEn as Record<string, string[]>), ...FIXOS };
  for (const kind of Object.keys(todos)) {
    it(`todo termo de ${kind} tem tradução`, () => {
      const dic = (ptTerms as Record<string, Record<string, string>>)[kind] ?? {};
      const faltando = todos[kind].filter((termo) => !dic[termo]);
      expect(faltando, `Sem tradução em ${kind}: ${faltando.join(", ")}`).toEqual([]);
      expect(t(kind as TermKind, todos[kind][0])).not.toBe("");
    });
  }
});
