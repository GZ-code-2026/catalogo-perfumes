import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPerfume, searchPerfumes, TenmlError } from "./client";
import search from "./__fixtures__/search.json";
import detail from "./__fixtures__/detail.json";

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function urlChamada(): string {
  return String(fetchMock.mock.calls[0][0]);
}

describe("searchPerfumes", () => {
  it("codifica a busca e mapeia key_notes e next_cursor", async () => {
    fetchMock.mockResolvedValue(resposta(search));
    const page = await searchPerfumes({ q: "L'Immensité & co" });
    expect(urlChamada()).toContain("q=L%27Immensit%C3%A9+%26+co");
    expect(urlChamada()).toContain("limit=20");
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
    expect(page.results[0].keyNotes).toEqual(search.results[0].key_notes);
    expect(page.nextCursor).toBe("bzM");
    expect(page.total).toBe(search.total);
  });

  it("envia iconic e cursor", async () => {
    fetchMock.mockResolvedValue(resposta(search));
    await searchPerfumes({ iconic: true, cursor: "x" });
    expect(urlChamada()).toContain("iconic=true&cursor=x");
  });
});

describe("getPerfume", () => {
  it("devolve o detalhe completo", async () => {
    fetchMock.mockResolvedValue(resposta(detail));
    const p = await getPerfume("dior-sauvage-edp");
    expect(urlChamada()).toContain("/perfumes/dior-sauvage-edp?format=detailed");
    expect(p?.pyramid?.top).toEqual(detail.perfume.pyramid.top);
    expect(p?.similar).toHaveLength(5);
    expect(p?.similar[0].sharedNotes.length).toBeGreaterThan(0);
  });

  it("devolve null quando exact é false", async () => {
    fetchMock.mockImplementation(async () => resposta({ ...detail, exact: false }));
    expect(await getPerfume("sauvage")).toBeNull();
  });

  it("devolve null quando found é false", async () => {
    fetchMock.mockImplementation(async () => resposta({ found: false }));
    expect(await getPerfume("nada")).toBeNull();
  });

  it("devolve null em HTTP 404", async () => {
    fetchMock.mockImplementation(async () => resposta({}, 404));
    expect(await getPerfume("nada")).toBeNull();
  });

  it("aceita perfil core sem pyramid, seasons e perfumers", async () => {
    const { pyramid, seasons, perfumers, ...core } = detail.perfume;
    void pyramid;
    void seasons;
    void perfumers;
    fetchMock.mockResolvedValue(resposta({ ...detail, perfume: core }));
    const p = await getPerfume("dior-sauvage-edp");
    expect(p?.pyramid).toBeUndefined();
    expect(p?.seasons).toEqual([]);
    expect(p?.perfumers).toEqual([]);
  });

  it("pirâmide com os três níveis vazios vira undefined", async () => {
    const perfume = { ...detail.perfume, pyramid: { top: [], heart: [], base: [] } };
    fetchMock.mockResolvedValue(resposta({ ...detail, perfume }));
    const p = await getPerfume("dior-sauvage-edp");
    expect(p?.pyramid).toBeUndefined();
  });

  it("pirâmide com só um nível preenchido é mantida", async () => {
    const perfume = { ...detail.perfume, pyramid: { top: ["bergamot"] } };
    fetchMock.mockResolvedValue(resposta({ ...detail, perfume }));
    const p = await getPerfume("dior-sauvage-edp");
    expect(p?.pyramid).toEqual({ top: ["bergamot"], heart: [], base: [] });
  });
});

describe("getPerfume com id trocado pela 10ML", () => {
  const edt = {
    ...detail,
    perfume: { ...detail.perfume, id: "dior-sauvage-edt", name: "Sauvage Eau de Toilette" },
    similar: detail.similar.slice(0, 2),
  };
  const baseDet = "https://mcp.10ml.com/api/v1/perfumes";
  const urlIdErrado = `${baseDet}/dior-sauvage-edt?format=detailed`;
  const urlBusca = (q: string) => `${baseDet}?q=${encodeURIComponent(q)}&limit=20`;
  const urlNome = `${baseDet}/Sauvage%20Eau%20de%20Toilette?house=Dior&format=detailed`;
  const resumoEdt = { id: "dior-sauvage-edt", name: "Sauvage Eau de Toilette", house: "Dior" };

  // Simula a API: cada URL tem sua resposta; o resto dá 404.
  function simular(respostas: Record<string, unknown>) {
    fetchMock.mockImplementation(async (url: string) =>
      url in respostas ? resposta(respostas[url]) : resposta({}, 404),
    );
  }
  const chamadas = () => fetchMock.mock.calls.map((c) => String(c[0]));

  it("caminho feliz faz uma única chamada", async () => {
    fetchMock.mockImplementation(async () => resposta(detail));
    await getPerfume("dior-sauvage-edp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolve pelo nome e pela casa quando o id volta trocado (busca a)", async () => {
    simular({
      [urlIdErrado]: detail,
      [urlBusca("dior sauvage eau de toilette")]: { results: [resumoEdt] },
      [urlNome]: edt,
    });
    const p = await getPerfume("dior-sauvage-edt");
    expect(p?.id).toBe("dior-sauvage-edt");
    expect(p?.similar).toHaveLength(2);
    expect(chamadas()).toEqual([
      urlIdErrado,
      urlBusca("dior sauvage eau de toilette"),
      urlNome,
    ]);
  });

  it("se a busca a falha, a busca b (sem a primeira palavra) resolve", async () => {
    simular({
      [urlIdErrado]: detail,
      [urlBusca("dior sauvage eau de toilette")]: { results: [] },
      [urlBusca("sauvage eau de toilette")]: { results: [resumoEdt] },
      [urlNome]: edt,
    });
    const p = await getPerfume("dior-sauvage-edt");
    expect(p?.id).toBe("dior-sauvage-edt");
    expect(chamadas()).toContain(urlBusca("sauvage eau de toilette"));
  });

  it("nenhuma busca acha o id: devolve null (nunca o perfume errado)", async () => {
    simular({ [urlIdErrado]: detail });
    expect(await getPerfume("dior-sauvage-edt")).toBeNull();
    expect(chamadas().some((u) => u.includes("?house="))).toBe(false);
  });

  it("chamada por nome devolvendo outro id: null", async () => {
    simular({
      [urlIdErrado]: detail,
      [urlBusca("dior sauvage eau de toilette")]: { results: [resumoEdt] },
      [urlNome]: detail,
    });
    expect(await getPerfume("dior-sauvage-edt")).toBeNull();
  });
});

describe("erros", () => {
  it("HTTP 500 lança TenmlError", async () => {
    fetchMock.mockResolvedValue(resposta({}, 500));
    await expect(getPerfume("x")).rejects.toBeInstanceOf(TenmlError);
    await expect(searchPerfumes({})).rejects.toBeInstanceOf(TenmlError);
  });

  it("falha de rede lança TenmlError", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(searchPerfumes({ q: "a" })).rejects.toBeInstanceOf(TenmlError);
  });

  it("JSON inválido lança TenmlError", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(getPerfume("x")).rejects.toBeInstanceOf(TenmlError);
  });
});
