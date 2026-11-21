import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Accords } from "@/components/Accords";
import { PerfumeCard } from "@/components/PerfumeCard";
import { PerfumeImage } from "@/components/PerfumeImage";
import { Pyramid } from "@/components/Pyramid";
import { isBot } from "@/lib/bots";
import { t } from "@/lib/i18n/terms";
import { toCards } from "@/lib/photos/cards";
import { getPhotoService } from "@/lib/photos/index";
import { getPerfume } from "@/lib/tenml/client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const perfume = await getPerfume(id);
  if (!perfume) return { title: "Perfume não encontrado" };
  return { title: `${perfume.name} — ${perfume.house}` };
}

function Escala({ rotulo, valor }: { rotulo: string; valor: number }) {
  const nivel = Math.min(5, Math.max(0, Math.round(valor)));
  return (
    <div>
      <h2 className="font-display text-xl tracking-tight">{rotulo}</h2>
      <div className="mt-2 flex items-center gap-1.5" role="img" aria-label={`${rotulo}: ${nivel} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={`h-3 w-3 rounded-full border border-brass ${n <= nivel ? "bg-brass" : ""}`}
          />
        ))}
        <span className="sr-only">{`${rotulo}: ${nivel} de 5`}</span>
      </div>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight">{titulo}</h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base text-ink">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function PerfumePage({ params }: Props) {
  const { id } = await params;

  // Se a 10ML falhar, o erro sobe para o error.tsx.
  const perfume = await getPerfume(id);
  if (!perfume) notFound();

  // Só esta página pode gastar a cota da Fragella, e nunca para robôs.
  const ua = (await headers()).get("user-agent");
  const foto = await getPhotoService().getPhoto(
    { id: perfume.id, name: perfume.name, house: perfume.house, concentration: perfume.concentration },
    { allowFetch: !isBot(ua) },
  );
  const parecidos = await toCards(perfume.similar);

  const linha = [perfume.house, perfume.year, perfume.concentration].filter(Boolean).join(" · ");
  const estacoes = perfume.seasons.map((s) => t("season", s));
  const ocasioes = perfume.occasions.map((o) => t("occasion", o));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <PerfumeImage
          src={foto}
          alt={`${perfume.name}, ${perfume.house}`}
          family={perfume.family}
          size="hero"
        />

        <div className="space-y-10">
          <header>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{perfume.name}</h1>
            <p className="mt-2 font-display text-lg italic text-ink-soft">{linha}</p>
            {(perfume.gender || perfume.family) && (
              <p className="mt-1 text-sm text-ink-soft">
                {[perfume.gender && t("gender", perfume.gender), perfume.family && t("family", perfume.family)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </header>

          {perfume.character && (
            <section>
              <p className="text-sm text-ink-soft">Descrição original (10ML)</p>
              <p className="mt-2 max-w-prose text-base leading-relaxed text-ink">{perfume.character}</p>
            </section>
          )}

          {perfume.pyramid && (
            <section>
              <h2 className="mb-3 font-display text-xl tracking-tight">Pirâmide olfativa</h2>
              <Pyramid pyramid={perfume.pyramid} />
            </section>
          )}

          {perfume.accords.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl tracking-tight">Acordes</h2>
              <Accords accords={perfume.accords} />
            </section>
          )}

          <Lista titulo="Estações" itens={estacoes} />
          <Lista titulo="Ocasiões" itens={ocasioes} />

          {perfume.longevity != null && <Escala rotulo="Fixação" valor={perfume.longevity} />}
          {perfume.projection != null && <Escala rotulo="Projeção" valor={perfume.projection} />}

          <Lista titulo="Perfumistas" itens={perfume.perfumers} />
        </div>
      </div>

      {parecidos.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl tracking-tight">Parecidos</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {parecidos.map((card) => (
              <PerfumeCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
