export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16" aria-busy="true">
      <div className="grid animate-pulse gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <div className="h-80 rounded-lg bg-ink/5 sm:h-[26rem]" />
        <div className="space-y-4">
          <div className="h-12 w-3/4 rounded bg-ink/5" />
          <div className="h-5 w-1/3 rounded bg-ink/5" />
          <div className="h-24 w-full rounded bg-ink/5" />
        </div>
      </div>
    </main>
  );
}
