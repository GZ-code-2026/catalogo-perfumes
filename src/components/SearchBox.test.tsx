import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { SearchBox } from "./SearchBox";

function resposta(items: { id: string; name: string; house: string }[]) {
  return { ok: true, json: async () => ({ items }) } as Response;
}

describe("SearchBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("busca sugestões com debounce e mostra só a resposta da última query", async () => {
    const resolvers: Record<string, (r: Response) => void> = {};
    const fetchMock = vi.fn((url: string) => new Promise<Response>((res) => {
      resolvers[url] = res;
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBox />);
    const input = screen.getByLabelText("Buscar perfume");

    fireEvent.change(input, { target: { value: "sau" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/sugestoes?q=sau");

    fireEvent.change(input, { target: { value: "sauv" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers["/api/sugestoes?q=sauv"](resposta([{ id: "2", name: "Sauvage", house: "Dior" }]));
      resolvers["/api/sugestoes?q=sau"](resposta([{ id: "1", name: "Sau Antigo", house: "X" }]));
    });

    expect(screen.getByRole("link", { name: /Sauvage/ }).getAttribute("href")).toBe("/perfume/2");
    expect(screen.queryByText("Sau Antigo")).toBeNull();

    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith("/busca?q=sauv");
  });

  it("mostra as sugestões da primeira consulta quando ela responde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([{ id: "1", name: "Sauvage", house: "Dior" }])));
    render(<SearchBox />);
    fireEvent.change(screen.getByLabelText("Buscar perfume"), { target: { value: "sau" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByText("Dior")).toBeTruthy();
  });

  async function digitarEMostrar(texto: string) {
    const input = screen.getByLabelText("Buscar perfume");
    fireEvent.change(input, { target: { value: texto } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    return input;
  }

  it("limpa as sugestões quando a API responde com erro", async () => {
    const fetchMock = vi.fn(async () => resposta([{ id: "1", name: "Sauvage", house: "Dior" }]));
    vi.stubGlobal("fetch", fetchMock);
    render(<SearchBox />);
    await digitarEMostrar("sau");
    expect(screen.getByText("Sauvage")).toBeTruthy();

    fetchMock.mockImplementation(async () => ({ ok: false, status: 500 }) as Response);
    await digitarEMostrar("sauv");
    expect(screen.queryByText("Sauvage")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("limpa as sugestões quando a rede falha", async () => {
    const fetchMock = vi.fn(async () => resposta([{ id: "1", name: "Sauvage", house: "Dior" }]));
    vi.stubGlobal("fetch", fetchMock);
    render(<SearchBox />);
    await digitarEMostrar("sau");
    expect(screen.getByText("Sauvage")).toBeTruthy();

    fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await digitarEMostrar("sauv");
    expect(screen.queryByText("Sauvage")).toBeNull();
  });

  it("fecha a lista quando o foco sai do formulário", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([{ id: "1", name: "Sauvage", house: "Dior" }])));
    render(
      <div>
        <SearchBox />
        <button>fora</button>
      </div>,
    );
    const input = await digitarEMostrar("sau");
    fireEvent.blur(input, { relatedTarget: screen.getByText("fora") });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("mantém a lista quando o foco vai para uma sugestão (o clique ainda navega)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([{ id: "1", name: "Sauvage", house: "Dior" }])));
    render(<SearchBox />);
    const input = await digitarEMostrar("sau");
    const link = screen.getByRole("link", { name: /Sauvage/ });
    fireEvent.blur(input, { relatedTarget: link });
    expect(screen.getByRole("link", { name: /Sauvage/ }).getAttribute("href")).toBe("/perfume/1");
  });
});
