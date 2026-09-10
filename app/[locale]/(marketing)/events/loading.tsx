export default function EventsLoading() {
  return (
    <main className="min-h-screen bg-midnight animate-pulse">
      {/* Hero skeleton */}
      <section className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="h-20 w-64 bg-white/10 rounded-lg mb-4" />
        <div className="h-5 w-80 bg-white/5 rounded" />
      </section>

      {/* Cards skeleton */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="h-48 bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-6 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-full bg-white/10 rounded" />
                <div className="h-10 w-full bg-white/10 rounded-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
