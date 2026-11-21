import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoadMore } from "@/components/LoadMore";
import { PerfumeCard } from "@/components/PerfumeCard";
import { SearchBox } from "@/components/SearchBox";
import { toCards } from "@/lib/photos/cards";
import { searchPerfumes } from "@/lib/tenml/client";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

function lerQ(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").trim();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = lerQ((await searchParams).q);
  return { title: q ? `Busca: ${q}` : "Busca" };
}

export default async function Busca({ searchParams }: Props) {
  const q = lerQ((await searchParams).q);
  if (!q) redirect("/");

  // Se a 10ML falhar, o erro sobe para o error.tsx.
  const page = await searchPerfumes({ q, limit: 20 });
  const cards = await toCards(page.results);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <SearchBox initialQuery={q} />
      </div>

      {cards.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-display text-2xl">Nenhum perfume encontrado para “{q}”.</p>
          <p className="mt-3 text-sm text-ink-soft">Tente buscar pelo nome da marca.</p>
        </div>
      ) : (
        <>
          <h1 className="mt-12 font-display text-3xl tracking-tight">Resultados para “{q}”</h1>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => (
              <PerfumeCard key={card.id} card={card} />
            ))}
          </div>
          <LoadMore q={q} initialCursor={page.nextCursor} />
        </>
      )}
    </main>
  );
}
