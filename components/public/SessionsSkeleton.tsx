export function SessionsSkeleton() {
  return (
    <section className="relative pt-0 pb-28 sm:pb-32 bg-midnight overflow-hidden animate-pulse">
      {/* Banner skeleton */}
      <div
        className="relative w-full py-14 sm:py-16 lg:py-20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 40%, #A3FF12 100%)' }}
      >
        <div className="relative z-10 text-center px-6 sm:px-10">
          <div className="h-16 sm:h-20 w-72 mx-auto bg-white/20 rounded-lg mb-3" />
          <div className="h-6 w-48 mx-auto bg-white/15 rounded" />
          <div className="h-4 w-64 mx-auto bg-white/10 rounded mt-3" />
          <div className="mt-8 mb-4 flex justify-center gap-4">
            <div className="h-10 w-32 bg-white/15 rounded-full" />
            <div className="h-10 w-32 bg-white/15 rounded-full" />
          </div>
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="h-40 bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-24 bg-white/10 rounded" />
                <div className="h-6 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
                <div className="h-10 w-full bg-white/10 rounded-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
