"use client";

import { useState } from "react";
import type { CardData } from "@/lib/photos/cards";
import { PerfumeCard } from "./PerfumeCard";

type LoadMoreProps = { q: string; initialCursor: string | null };

// Botão "Carregar mais": busca a próxima página e acrescenta os cards abaixo.
export function LoadMore({ q, initialCursor }: LoadMoreProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  async function carregarMais() {
    if (!cursor) return;
    setCarregando(true);
    setErro(false);
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}&cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error("falhou");
      const data: { results: CardData[]; nextCursor: string | null } = await res.json();
      setCards((atuais) => [...atuais, ...data.results]);
      setCursor(data.nextCursor);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {cards.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <PerfumeCard key={card.id} card={card} />
          ))}
        </div>
      )}
      {cursor && (
        <div className="mt-12 text-center">
          {erro && <p className="mb-3 text-sm text-ink-soft">Não foi possível carregar mais</p>}
          <button
            type="button"
            onClick={carregarMais}
            disabled={carregando}
            className="rounded-full border border-brass px-6 py-2 text-sm text-ink hover:bg-brass/10 disabled:opacity-50"
          >
            {carregando ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
