export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16" aria-busy="true">
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 rounded-lg bg-ink/5" />
            <div className="mt-3 h-4 w-3/4 rounded bg-ink/5" />
            <div className="mt-2 h-3 w-1/2 rounded bg-ink/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
