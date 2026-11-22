import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadMore } from "./LoadMore";

function resposta(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 502, json: async () => body } as Response;
}

const novo = { id: "p9", name: "Perfume Novo", house: "Casa Nova", imageUrl: null };

describe("LoadMore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("busca a próxima página e mostra os novos cards", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({ results: [novo], nextCursor: "bzQw" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LoadMore q="sauvage" initialCursor="bzM" />);

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Perfume Novo")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/busca?q=sauvage&cursor=bzM");
    expect(screen.getByRole("button", { name: "Carregar mais" })).toBeTruthy();
  });

  it("some quando não há mais páginas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({ results: [novo], nextCursor: null })));
    render(<LoadMore q="sauvage" initialCursor="bzM" />);

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Perfume Novo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  it("mostra erro e mantém o botão quando a resposta falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({}, false)));
    render(<LoadMore q="sauvage" initialCursor="bzM" />);

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Não foi possível carregar mais")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Carregar mais" })).toBeTruthy();
  });

  it("não aparece sem cursor inicial", () => {
    render(<LoadMore q="sauvage" initialCursor={null} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
