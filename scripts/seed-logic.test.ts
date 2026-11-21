import { describe, expect, it, vi } from "vitest";
import { assuntoComConcentracao, classificar, variaveisFaltando } from "./seed-logic";

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

describe("variaveisFaltando", () => {
  it("lista as que faltam", () => {
    expect(variaveisFaltando({ SUPABASE_URL: "u" })).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY",
      "FRAGELLA_API_KEY",
    ]);
  });
});

describe("assuntoComConcentracao", () => {
  const resumo = { id: "creed-green-irish-tweed-edp", name: "Green Irish Tweed", house: "Creed" };

  it("busca o detalhe e usa a concentração dele", async () => {
    const buscarDetalhe = vi.fn(async () => ({ concentration: "EDP", gender: "men" }));
    expect(await assuntoComConcentracao(resumo, buscarDetalhe)).toEqual({
      ...resumo,
      concentration: "EDP",
      gender: "men",
    });
    expect(buscarDetalhe).toHaveBeenCalledWith("creed-green-irish-tweed-edp");
  });

  it("devolve null quando o detalhe não existe", async () => {
    expect(await assuntoComConcentracao(resumo, async () => null)).toBeNull();
  });

  it("devolve null quando a 10ML falha", async () => {
    const falha = async () => {
      throw new Error("fora do ar");
    };
    expect(await assuntoComConcentracao(resumo, falha)).toBeNull();
  });
});
