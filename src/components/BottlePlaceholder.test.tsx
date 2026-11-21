import { render, screen } from "@testing-library/react";
import { BottlePlaceholder, familyColor } from "./BottlePlaceholder";

describe("familyColor", () => {
  it("dá cores diferentes para famílias diferentes e para o padrão", () => {
    expect(familyColor("Aromatic fougere")).not.toBe(familyColor(undefined));
    expect(familyColor("Floral")).not.toBe(familyColor("Woody"));
  });

  it("ignora maiúsculas e usa a primeira família que aparece no texto", () => {
    expect(familyColor("WOODY")).toBe(familyColor("woody"));
    expect(familyColor("Woody floral")).toBe(familyColor("Woody"));
    expect(familyColor("Floral woody")).toBe(familyColor("Floral"));
  });

  it("usa a cor padrão para família desconhecida", () => {
    expect(familyColor("Musky")).toBe(familyColor(undefined));
  });
});

describe("BottlePlaceholder", () => {
  it("é uma imagem acessível com o rótulo informado", () => {
    render(<BottlePlaceholder family="Floral" label="Frasco de Chanel No 5" />);
    expect(screen.getByRole("img", { name: "Frasco de Chanel No 5" })).toBeInTheDocument();
  });
});
