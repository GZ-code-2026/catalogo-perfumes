import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-24 text-center sm:px-8">
      <h1 className="font-display text-4xl tracking-tight">Perfume não encontrado</h1>
      <p className="mt-4 text-ink-soft">Ele pode ter mudado de nome ou saído do catálogo.</p>
      <Link href="/" className="mt-8 inline-block text-brass underline underline-offset-4">
        Voltar para a busca
      </Link>
    </main>
  );
}
