import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n/terms";
import { Accords } from "./Accords";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeImage } from "./PerfumeImage";
import { Pyramid } from "./Pyramid";

// next/image vira um <img> simples que repassa onError.
vi.mock("next/image", () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}));

describe("PerfumeImage", () => {
  it("mostra o placeholder quando não há foto", () => {
    render(<PerfumeImage src={null} alt="Sauvage" size="card" />);
    expect(screen.getByRole("img", { name: "Sauvage" })).toBeInTheDocument();
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("troca pela imagem e volta ao placeholder se a foto falhar", () => {
    render(<PerfumeImage src="https://cdn.fragella.com/a.webp" alt="Sauvage" size="hero" />);
    const img = screen.getByRole("img", { name: "Sauvage" });
    expect(img.tagName).toBe("IMG");
    fireEvent.error(img);
    const depois = screen.getByRole("img", { name: "Sauvage" });
    expect(depois.tagName.toLowerCase()).toBe("svg");
  });
});

describe("PerfumeCard", () => {
  it("liga para a ficha e mostra nome, marca e família traduzida", () => {
    render(
      <PerfumeCard
        card={{ id: "dior-sauvage-edp", name: "Sauvage", house: "Dior", family: "Woody", imageUrl: null }}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/perfume/dior-sauvage-edp");
    expect(screen.getByText("Sauvage")).toBeInTheDocument();
    expect(screen.getByText("Dior")).toBeInTheDocument();
    expect(screen.getByText(t("family", "Woody"))).toBeInTheDocument();
  });
});

describe("Pyramid", () => {
  it("mostra só os níveis preenchidos, com notas traduzidas", () => {
    render(<Pyramid pyramid={{ top: ["bergamot"], heart: [], base: ["vanilla"] }} />);
    expect(screen.getByText("Topo")).toBeInTheDocument();
    expect(screen.getByText("Fundo")).toBeInTheDocument();
    expect(screen.queryByText("Coração")).not.toBeInTheDocument();
    expect(screen.getByText("Bergamota")).toBeInTheDocument();
  });

  it("não renderiza nada sem pirâmide e nunca mostra undefined", () => {
    const { container } = render(<Pyramid />);
    expect(container).toBeEmptyDOMElement();
    expect(container.textContent).not.toContain("undefined");
  });
});

describe("Accords", () => {
  it("não renderiza nada com lista vazia", () => {
    const { container } = render(<Accords accords={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
