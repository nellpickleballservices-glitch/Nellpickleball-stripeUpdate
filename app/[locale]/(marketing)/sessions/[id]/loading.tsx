export default function SessionDetailLoading() {
  return (
    <main className="min-h-screen bg-dim animate-pulse">
      {/* Hero image skeleton */}
      <div className="h-[50vh] md:h-[62vh] bg-charcoal/30" />

      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-14 pb-28">
        {/* Title */}
        <div className="h-14 w-3/4 bg-gray-200 rounded-lg mb-4" />

        {/* Meta row */}
        <div className="flex gap-6 mb-6">
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-5 w-24 bg-gray-200 rounded" />
        </div>

        {/* Divider */}
        <div className="w-24 h-0.5 bg-gray-200 rounded-full mb-12" />

        {/* Content blocks */}
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>

        {/* Dates grid */}
        <div className="mt-14">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Signup form */}
        <div className="mt-14 h-48 bg-gray-200 rounded-2xl" />
      </div>
    </main>
  )
}
