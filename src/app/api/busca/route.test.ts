import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenml/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tenml/client")>("@/lib/tenml/client");
  return { ...actual, searchPerfumes: vi.fn() };
});
vi.mock("@/lib/photos/cards", () => ({
  toCards: vi.fn(async (items: { id: string; name: string; house: string }[]) =>
    items.map((i) => ({ id: i.id, name: i.name, house: i.house, imageUrl: null })),
  ),
}));

import { TenmlError, searchPerfumes } from "@/lib/tenml/client";
import { GET } from "./route";

const mockSearch = vi.mocked(searchPerfumes);

function req(query: string) {
  return new Request(`http://localhost/api/busca${query}`);
}

describe("GET /api/busca", () => {
  beforeEach(() => mockSearch.mockReset());

  it("responde 400 sem q", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("repassa o cursor e devolve nextCursor", async () => {
    mockSearch.mockResolvedValue({
      results: [{ id: "p1", name: "Nome", house: "Casa", accords: [], keyNotes: [] }],
      nextCursor: "bzQw",
      total: 50,
    });
    const res = await GET(req("?q=sauvage&cursor=bzM"));
    expect(mockSearch).toHaveBeenCalledWith({ q: "sauvage", limit: 20, cursor: "bzM" });
    expect(await res.json()).toEqual({
      results: [{ id: "p1", name: "Nome", house: "Casa", imageUrl: null }],
      nextCursor: "bzQw",
    });
  });

  it("responde 502 quando a 10ML falha", async () => {
    mockSearch.mockImplementationOnce(() => Promise.reject(new TenmlError("falhou")));
    const res = await GET(req("?q=sauvage"));
    expect(res.status).toBe(502);
  });
});
