import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isFragellaConfigured, pickImage, searchFragrances } from "./client";

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("FRAGELLA_API_KEY", "chave-teste");
  vi.stubEnv("FRAGELLA_BASE_URL", "https://api.teste/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const bruto = {
  Name: "Sauvage",
  Brand: "Dior",
  OilType: "Eau de Parfum",
  "Image URL": "https://cdn.fragella.com/images/a.jpg",
  "Image URL Transparent": "https://cdn.fragella.com/images/a.webp",
};

describe("searchFragrances", () => {
  it("envia o header x-api-key e a URL certa", async () => {
    fetchMock.mockResolvedValue(resposta([bruto]));
    await searchFragrances("Dior Sauvage");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.teste/api/v1/fragrances?search=Dior+Sauvage&limit=10",
    );
    expect(init.headers["x-api-key"]).toBe("chave-teste");
  });

  it("mapeia os campos", async () => {
    fetchMock.mockResolvedValue(resposta([bruto]));
    expect(await searchFragrances("x")).toEqual([
      {
        name: "Sauvage",
        brand: "Dior",
        oilType: "Eau de Parfum",
        imageUrl: "https://cdn.fragella.com/images/a.jpg",
        imageUrlTransparent: "https://cdn.fragella.com/images/a.webp",
      },
    ]);
  });

  it("aceita o formato { data: [...] } e descarta itens sem Name/Brand", async () => {
    fetchMock.mockResolvedValue(resposta({ data: [bruto, { Name: "Sem marca" }] }));
    const r = await searchFragrances("x");
    expect(r).toHaveLength(1);
  });

  it("429 devolve null", async () => {
    fetchMock.mockResolvedValue(resposta({}, 429));
    expect(await searchFragrances("x")).toBeNull();
  });

  it("500 devolve null", async () => {
    fetchMock.mockResolvedValue(resposta({}, 500));
    expect(await searchFragrances("x")).toBeNull();
  });

  it("corpo inesperado devolve null", async () => {
    fetchMock.mockResolvedValue(resposta({ erro: 1 }));
    expect(await searchFragrances("x")).toBeNull();
  });

  it("200 vazio devolve []", async () => {
    fetchMock.mockResolvedValue(resposta([]));
    expect(await searchFragrances("x")).toEqual([]);
  });

  it("erro de rede ou timeout devolve null", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect(await searchFragrances("x")).toBeNull();
  });

  it("sem chave devolve null sem chamar fetch", async () => {
    vi.stubEnv("FRAGELLA_API_KEY", "");
    expect(isFragellaConfigured()).toBe(false);
    expect(await searchFragrances("x")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pickImage", () => {
  it("prefere a transparente", () => {
    expect(
      pickImage({
        name: "a",
        brand: "b",
        imageUrl: "https://x/a.jpg",
        imageUrlTransparent: "https://x/a.webp",
      }),
    ).toBe("https://x/a.webp");
  });

  it("usa a jpg se não houver transparente", () => {
    expect(pickImage({ name: "a", brand: "b", imageUrl: "https://x/a.jpg" })).toBe(
      "https://x/a.jpg",
    );
  });

  it("devolve null sem URL ou sem https", () => {
    expect(pickImage({ name: "a", brand: "b" })).toBeNull();
    expect(pickImage({ name: "a", brand: "b", imageUrl: "http://x/a.jpg" })).toBeNull();
  });
});
