import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("mostra o crédito da 10ML com o link exato", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: "Data: 10ML Fragrance Index" });
    expect(link).toHaveTextContent(/^Data: 10ML Fragrance Index$/);
    expect(link).toHaveAttribute("href", "https://10ml.com/perfume-api");
  });
});
