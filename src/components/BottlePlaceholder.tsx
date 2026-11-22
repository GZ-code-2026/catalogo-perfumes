// Frasco ilustrado mostrado quando o perfume não tem foto.
// Componente sem hooks: funciona no servidor e dentro de componentes client.

// Cor de cada família olfativa. Tons médios, legíveis no tema claro e no escuro.
const FAMILY_COLORS: Record<string, string> = {
  floral: "#c2738a", // rosa antigo
  woody: "#94764f", // madeira clara
  amber: "#c08a3e", // âmbar
  oriental: "#c08a3e", // nome antigo de âmbar
  fresh: "#c4b04a", // casca de limão
  citrus: "#c4b04a",
  aromatic: "#8a7fb0", // lavanda
  fougere: "#8a7fb0",
  gourmand: "#a5653f", // caramelo
  leather: "#7d4e3f", // couro
  aquatic: "#4e8fa8", // mar
  chypre: "#7f8446", // musgo
  green: "#5f9b62", // folha
};

const DEFAULT_COLOR = "#8e9a92"; // verde-acinzentado neutro

// Escolhe a cor pela palavra-chave que aparece primeiro no nome da família.
// Ex.: "Woody floral" usa a cor de "woody"; "Floral woody" usa a de "floral".
export function familyColor(family: string | undefined): string {
  if (!family) return DEFAULT_COLOR;
  const texto = family.toLowerCase();

  let melhorPosicao = Infinity;
  let cor = DEFAULT_COLOR;
  for (const [palavra, corDaPalavra] of Object.entries(FAMILY_COLORS)) {
    const posicao = texto.indexOf(palavra);
    if (posicao !== -1 && posicao < melhorPosicao) {
      melhorPosicao = posicao;
      cor = corDaPalavra;
    }
  }
  return cor;
}

type BottlePlaceholderProps = {
  family?: string;
  label: string;
  className?: string;
};

export function BottlePlaceholder({ family, label, className }: BottlePlaceholderProps) {
  const cor = familyColor(family);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 120 160"
      className={className ?? "h-full w-full"}
    >
      {/* halo suave atrás do frasco, como nas fotos que "flutuam" */}
      <ellipse cx="60" cy="92" rx="54" ry="60" fill={cor} opacity="0.12" />
      {/* sombra no chão */}
      <ellipse cx="60" cy="148" rx="32" ry="3.5" className="fill-ink" opacity="0.12" />

      {/* tampa canelada */}
      <rect x="46" y="14" width="28" height="27" rx="2" className="fill-brass" />
      <path d="M53 17V38M60 17V38M67 17V38" className="stroke-paper" strokeWidth="1" opacity="0.35" />
      {/* gargalo */}
      <rect x="52" y="41" width="16" height="9" className="fill-ink" opacity="0.55" />

      {/* corpo do frasco (vidro) */}
      <path
        d="M42 50H78L90 62V134Q90 142 82 142H38Q30 142 30 134V62Z"
        fill={cor}
        fillOpacity="0.18"
        className="stroke-ink"
        strokeOpacity="0.45"
        strokeWidth="1.25"
      />
      {/* líquido */}
      <path d="M35 84H85V132Q85 137 80 137H40Q35 137 35 132Z" fill={cor} opacity="0.75" />
      <path d="M35 84H85" stroke={cor} strokeWidth="1.5" />
      {/* reflexo do vidro */}
      <path d="M38 66V128" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 70V96" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
