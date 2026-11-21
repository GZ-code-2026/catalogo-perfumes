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
    fetchMock.mockResolvedValue(resposta({ ...detail, exact: false }));
    expect(await getPerfume("sauvage")).toBeNull();
  });

  it("devolve null quando found é false", async () => {
    fetchMock.mockResolvedValue(resposta({ found: false }));
    expect(await getPerfume("nada")).toBeNull();
  });

  it("devolve null em HTTP 404", async () => {
    fetchMock.mockResolvedValue(resposta({}, 404));
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
