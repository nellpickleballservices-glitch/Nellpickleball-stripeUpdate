export function ExpeditionsSkeleton() {
  return (
    <section
      className="relative pb-24 md:pb-32 overflow-hidden animate-pulse"
      style={{
        background: 'linear-gradient(135deg, #EFF8F4 0%, #FAF6ED 45%, #E5F2EE 100%)',
      }}
    >
      {/* Banner skeleton */}
      <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] bg-charcoal/20 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-16 w-72 mx-auto bg-white/20 rounded-lg" />
          <div className="h-5 w-56 mx-auto bg-white/15 rounded" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 mt-12 md:mt-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[12px] overflow-hidden bg-white shadow-md border border-white">
              <div className="h-56 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
