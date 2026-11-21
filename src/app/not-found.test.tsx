import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("not-found.tsx", () => {
  it("mostra a mensagem em português e o link para a home", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar para o início" }).getAttribute("href")).toBe("/");
  });
});
