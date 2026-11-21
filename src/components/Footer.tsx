// Rodapé presente em todas as páginas, com o crédito obrigatório da 10ML.
export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
        <p className="font-display text-lg italic text-ink">Catálogo de Perfumes</p>
        <a
          href="https://10ml.com/perfume-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ink-soft underline decoration-brass/60 underline-offset-4 transition-colors hover:text-brass"
        >
          Data: 10ML Fragrance Index
        </a>
      </div>
    </footer>
  );
}
