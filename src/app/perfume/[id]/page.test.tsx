import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerfumeDetail } from "@/lib/tenml/types";

const getPerfume = vi.fn();
const getPhoto = vi.fn();
const headersGet = vi.fn();

vi.mock("@/lib/tenml/client", () => ({ getPerfume: (id: string) => getPerfume(id) }));
vi.mock("@/lib/photos/index", () => ({ getPhotoService: () => ({ getPhoto }) }));
vi.mock("@/lib/photos/cards", () => ({
  toCards: async (items: { id: string; name: string; house: string }[]) =>
    items.map((i) => ({ id: i.id, name: i.name, house: i.house, imageUrl: null })),
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: headersGet }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import Page from "./page";

const completo: PerfumeDetail = {
  id: "sauvage",
  name: "Sauvage",
  house: "Dior",
  year: 2018,
  concentration: "EDP",
  gender: "men",
  family: "aromatic",
  accords: ["fresh spicy", "woody"],
  keyNotes: [],
  character: "Fresco e picante.",
  pyramid: { top: ["bergamot"], heart: ["pepper"], base: ["ambroxan"] },
  seasons: ["spring"],
  occasions: ["casual"],
  styles: [],
  longevity: 4,
  projection: 3,
  perfumers: ["François Demachy"],
  similar: Array.from({ length: 5 }, (_, i) => ({
    id: `s${i}`,
    name: `Parecido ${i}`,
    house: "Casa",
    sharedNotes: [],
  })),
};

const core: PerfumeDetail = {
  id: "x",
  name: "Simples",
  house: "Marca",
  accords: [],
  keyNotes: [],
  seasons: [],
  occasions: [],
  styles: [],
  perfumers: [],
  similar: [],
};

async function renderPage(id = "sauvage") {
  render(await Page({ params: Promise.resolve({ id }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getPhoto.mockResolvedValue(null);
  headersGet.mockReturnValue("Mozilla/5.0 Chrome/120");
});

describe("página de detalhe", () => {
  it("mostra a ficha completa", async () => {
    getPerfume.mockResolvedValue(completo);
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Sauvage" })).toBeTruthy();
    expect(screen.getByText(/Dior · 2018 · EDP/)).toBeTruthy();
    expect(screen.getByText("Descrição original (10ML)")).toBeTruthy();
    expect(screen.getByText("Topo")).toBeTruthy();
    expect(screen.getByText("Fixação: 4 de 5")).toBeTruthy();
    expect(screen.getByText("François Demachy")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Parecidos" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Parecido \d/ })).toHaveLength(5);
    expect(screen.getByText(/Aromático/i)).toBeTruthy();
  });

  it("só busca foto na Fragella para visitantes reais", async () => {
    getPerfume.mockResolvedValue(completo);
    await renderPage();
    expect(getPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sauvage", concentration: "EDP" }),
      { allowFetch: true },
    );

    headersGet.mockReturnValue("Mozilla/5.0 (compatible; Googlebot/2.1)");
    await renderPage();
    expect(getPhoto).toHaveBeenLastCalledWith(expect.anything(), { allowFetch: false });
  });

  it("chama notFound quando o perfume não existe", async () => {
    getPerfume.mockResolvedValue(null);
    await expect(renderPage("nada")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil básico não mostra seções vazias nem 'undefined'", async () => {
    getPerfume.mockResolvedValue(core);
    const { container } = render(await Page({ params: Promise.resolve({ id: "x" }) }));

    expect(screen.queryByText("Topo")).toBeNull();
    expect(screen.queryByText(/Fixação/)).toBeNull();
    expect(screen.queryByText("Estações")).toBeNull();
    expect(screen.queryByText("Perfumistas")).toBeNull();
    expect(screen.queryByText("Parecidos")).toBeNull();
    expect(screen.queryByText(/Descrição original/)).toBeNull();
    expect(container.textContent).not.toMatch(/undefined|null|NaN/);
  });

  it("mostra no máximo 6 parecidos", async () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({
      id: `m${i}`,
      name: `Parecido ${i}`,
      house: "Casa",
      sharedNotes: [],
    }));
    getPerfume.mockResolvedValue({ ...completo, similar: muitos });
    await renderPage();
    expect(screen.getAllByRole("link", { name: /Parecido \d/ })).toHaveLength(6);
  });

  it("não mostra a escala quando o valor não é um número finito", async () => {
    getPerfume.mockResolvedValue({ ...completo, longevity: NaN, projection: Infinity });
    const { container } = render(await Page({ params: Promise.resolve({ id: "sauvage" }) }));
    expect(screen.queryByText(/Fixação/)).toBeNull();
    expect(screen.queryByText(/Projeção/)).toBeNull();
    expect(container.textContent).not.toMatch(/NaN/);
  });
});
