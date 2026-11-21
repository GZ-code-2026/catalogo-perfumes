import Link from "next/link";
import { t } from "@/lib/i18n/terms";
import type { CardData } from "@/lib/photos/cards";
import { PerfumeImage } from "./PerfumeImage";

export function PerfumeCard({ card }: { card: CardData }) {
  // prefetch desligado: abrir o detalhe pode gastar a cota da Fragella, então só quando clicar.
  return (
    <Link href={`/perfume/${card.id}`} prefetch={false} className="group block">
      <PerfumeImage src={card.imageUrl} alt={`${card.name}, ${card.house}`} family={card.family} size="card" />
      <div className="mt-3">
        <p className="font-display text-lg leading-snug tracking-tight text-ink group-hover:text-brass">
          {card.name}
        </p>
        <p className="font-display text-sm italic text-ink-soft">{card.house}</p>
        {card.family && <p className="mt-1 text-xs text-ink-soft">{t("family", card.family)}</p>}
      </div>
    </Link>
  );
}
