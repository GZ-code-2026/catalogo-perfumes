"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Suggestion = { id: string; name: string; house: string };

export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const skipNext = useRef(initialQuery.length > 0);

  useEffect(() => {
    // Não abre sugestões só porque a página já veio com um texto
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const text = query.trim();
    if (text.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sugestoes?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;
        setItems(data.items ?? []);
        setOpen(true);
      } catch {
        // Pedido cancelado: outro já está a caminho, não mexe em nada.
        if (controller.signal.aborted) return;
        // Erro da API ou da rede: tira as sugestões antigas da tela.
        setItems([]);
        setOpen(false);
      }
    }, 300);
    // Ao digitar de novo, cancela o timer e o pedido anterior
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    setOpen(false);
    router.push("/busca?q=" + encodeURIComponent(text));
  }

  const showList = open && query.trim().length >= 2 && items.length > 0;

  return (
    <form
      onSubmit={submit}
      onBlur={(e) => {
        // Fecha a lista quando o foco sai do formulário (mas não ao ir para uma sugestão).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      role="search"
      className="relative w-full"
    >
      <label htmlFor="busca-perfume" className="sr-only">
        Buscar perfume
      </label>
      <div className="flex gap-2">
        <input
          id="busca-perfume"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="busca-sugestoes"
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Busque por perfume ou marca"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-soft focus:border-brass focus:outline-2 focus:outline-brass"
        />
        <button
          type="submit"
          className="rounded-sm bg-brass px-5 py-3 font-medium text-paper hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Buscar
        </button>
      </div>
      {showList && (
        <ul
          id="busca-sugestoes"
          role="listbox"
          // Evita que o campo perca o foco ao clicar numa sugestão (Safari não foca links).
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 z-10 mt-1 rounded-sm border border-line bg-surface py-1 shadow-sm"
        >
          {items.map((item) => (
            <li key={item.id} role="option" aria-selected={false}>
              {/* prefetch desligado: abrir o detalhe pode gastar a cota da Fragella. */}
              <Link
                href={`/perfume/${item.id}`}
                prefetch={false}
                className="block px-4 py-2 hover:bg-paper focus-visible:bg-paper"
              >
                <span className="font-display text-lg text-ink">{item.name}</span>{" "}
                <span className="font-display text-sm italic text-ink-soft">{item.house}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
