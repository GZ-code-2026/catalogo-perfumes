import { t } from "@/lib/i18n/terms";

// A 10ML manda notas em minúsculas; na tela começam com maiúscula.
function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type PyramidProps = {
  pyramid?: { top: string[]; heart: string[]; base: string[] };
};

// Pirâmide olfativa: topo, coração e fundo. Níveis vazios não aparecem.
export function Pyramid({ pyramid }: PyramidProps) {
  if (!pyramid) return null;

  const niveis = [
    { rotulo: "Topo", notas: pyramid.top },
    { rotulo: "Coração", notas: pyramid.heart },
    { rotulo: "Fundo", notas: pyramid.base },
  ].filter((nivel) => nivel.notas.length > 0);

  if (niveis.length === 0) return null;

  return (
    <div className="divide-y divide-line border-y border-line">
      {niveis.map((nivel) => (
        <div key={nivel.rotulo} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
          <h3 className="font-display text-lg italic text-brass sm:w-28 sm:shrink-0">{nivel.rotulo}</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-base text-ink">
            {nivel.notas.map((nota) => (
              <li key={nota}>{comMaiuscula(t("note", nota))}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
