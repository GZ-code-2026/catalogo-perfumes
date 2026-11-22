import { describe, expect, it } from "vitest";
import { planejarRenormalizacao, recalcularLinha, type LinhaSeen } from "./renormalize-logic";

function linha(id: number, raw_brand: string, raw_name: string, concentration: string | null, extra: Partial<LinhaSeen> = {}): LinhaSeen {
  // brand_norm/name_norm "antigos", como as regras velhas gravaram.
  return { id, raw_brand, raw_name, concentration, image_url: `img${id}`, brand_norm: "velho", name_norm: "velho", ...extra };
}

describe("recalcularLinha", () => {
  it("aplica as regras atuais (apelido, prefixo de marca, descritor)", () => {
    expect(recalcularLinha(linha(1, "Christian Dior", "Dior Sauvage", "edt"))).toEqual({
      brand_norm: "dior",
      name_norm: "sauvage",
      concentration: "edt",
    });
  });
  it("concentração do nome vence a gravada", () => {
    expect(recalcularLinha(linha(1, "Dior", "Sauvage Parfum for men", "edp")).concentration).toBe("parfum");
  });
  it("sem concentração no nome, mantém a gravada", () => {
    expect(recalcularLinha(linha(1, "Dior", "Sauvage", "edt")).concentration).toBe("edt");
    expect(recalcularLinha(linha(1, "Dior", "Balade Sauvage unisex", null)).concentration).toBeNull();
  });
});

describe("planejarRenormalizacao", () => {
  it("atualiza só as linhas que mudaram", () => {
    const certa = linha(1, "Dior", "Sauvage", "edt", { brand_norm: "dior", name_norm: "sauvage" });
    const velha = linha(2, "Christian Dior", "Dior Sauvage Elixir", "edp");
    expect(planejarRenormalizacao([certa, velha])).toEqual({
      atualizar: [{ id: 2, brand_norm: "dior", name_norm: "sauvage elixir", concentration: "edp" }],
      apagar: [],
    });
  });
  it("apaga a linha que viraria duplicada (mesma chave e mesma imagem)", () => {
    const certa = linha(5, "Dior", "Sauvage", "edt", { brand_norm: "dior", name_norm: "sauvage", image_url: "x" });
    const dup = linha(1, "Christian Dior", "Dior Sauvage", "edt", { image_url: "x" });
    expect(planejarRenormalizacao([dup, certa])).toEqual({ atualizar: [], apagar: [1] });
  });
  it("duas linhas que mudam para a mesma chave: a primeira fica, a outra é apagada", () => {
    const a = linha(1, "Christian Dior", "Dior Sauvage", "edt", { image_url: "x" });
    const b = linha(2, "Dior", "Christian Dior Sauvage", "edt", { image_url: "x" });
    expect(planejarRenormalizacao([a, b])).toEqual({
      atualizar: [{ id: 1, brand_norm: "dior", name_norm: "sauvage", concentration: "edt" }],
      apagar: [2],
    });
  });
  it("mesma chave com imagens diferentes não é duplicado", () => {
    const a = linha(1, "Christian Dior", "Dior Sauvage", "edt");
    const b = linha(2, "Dior", "Dior Sauvage Edt", "edt");
    expect(planejarRenormalizacao([a, b]).apagar).toEqual([]);
    expect(planejarRenormalizacao([a, b]).atualizar).toHaveLength(2);
  });
});
