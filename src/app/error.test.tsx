import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import ErrorBoundary from "./error";

describe("error.tsx", () => {
  it("mostra a mensagem amigável e refaz a requisição ao tentar de novo", () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("detalhe interno")} reset={reset} />);

    expect(screen.getByText("Não conseguimos falar com o catálogo agora.")).toBeTruthy();
    expect(screen.queryByText(/detalhe interno/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
