import { PerfumeCard } from "@/components/PerfumeCard";
import { SearchBox } from "@/components/SearchBox";
import { toCards } from "@/lib/photos/cards";
import type { CardData } from "@/lib/photos/cards";
import { TenmlError, searchPerfumes } from "@/lib/tenml/client";

// Refaz a vitrine (e as fotos já em cache) a cada 5 minutos.
export const revalidate = 300;

async function carregarVitrine(): Promise<CardData[] | null> {
  try {
    const page = await searchPerfumes({ iconic: true, limit: 12 });
    return await toCards(page.results);
  } catch (error) {
    if (error instanceof TenmlError) return null;
    throw error;
  }
}

export default async function Home() {
  const cards = await carregarVitrine();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Catálogo de Perfumes</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Descubra fragrâncias icônicas, suas notas e acordes, e encontre perfumes parecidos.
        </p>
        <div className="mt-8 text-left">
          <SearchBox />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl tracking-tight">Vitrine</h2>
        {cards ? (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => (
              <PerfumeCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">A vitrine está indisponível no momento.</p>
        )}
      </section>
    </main>
  );
}
