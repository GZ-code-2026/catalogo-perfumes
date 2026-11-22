import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenml/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tenml/client")>("@/lib/tenml/client");
  return { ...actual, searchPerfumes: vi.fn() };
});

import { TenmlError, searchPerfumes } from "@/lib/tenml/client";
import { GET } from "./route";

const mockSearch = vi.mocked(searchPerfumes);

function req(q: string) {
  return new Request(`http://localhost/api/sugestoes?q=${encodeURIComponent(q)}`);
}

describe("GET /api/sugestoes", () => {
  beforeEach(() => mockSearch.mockReset());

  it("devolve lista vazia sem chamar a 10ML quando q é curto", async () => {
    const res = await GET(req("a"));
    expect(await res.json()).toEqual({ items: [] });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("devolve no máximo 8 itens", async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`, name: `Nome ${i}`, house: "Casa", accords: [], keyNotes: [],
    }));
    mockSearch.mockResolvedValue({ results, nextCursor: null, total: 10 });
    const res = await GET(req("sauvage"));
    const body = await res.json();
    expect(body.items).toHaveLength(8);
    expect(body.items[0]).toEqual({ id: "p0", name: "Nome 0", house: "Casa" });
  });

  it("responde 502 quando a 10ML falha", async () => {
    mockSearch.mockImplementationOnce(() => {
      return Promise.reject(new TenmlError("falhou"));
    });
    const res = await GET(req("sauvage"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ items: [] });
  });
});
