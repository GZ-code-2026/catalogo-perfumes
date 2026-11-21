"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  // reset() sozinho só redesenha o cliente; refresh() refaz a busca no servidor.
  function tentarDeNovo() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-24 text-center">
      <p className="font-display text-3xl tracking-tight">Não conseguimos falar com o catálogo agora.</p>
      <button
        type="button"
        onClick={tentarDeNovo}
        className="mt-8 rounded-full border border-brass px-6 py-2 text-sm text-ink hover:bg-brass/10"
      >
        Tentar de novo
      </button>
    </main>
  );
}
