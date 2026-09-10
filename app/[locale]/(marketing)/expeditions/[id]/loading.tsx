export default function ExpeditionDetailLoading() {
  return (
    <main className="min-h-screen bg-dim animate-pulse">
      {/* Hero image skeleton */}
      <div className="h-[65vh] md:h-[78vh] bg-charcoal/30" />

      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-14 pb-28">
        {/* Title */}
        <div className="h-16 w-3/4 bg-gray-200 rounded-lg mb-3" />

        {/* Date range */}
        <div className="h-6 w-56 bg-gray-200 rounded mb-6" />

        <div className="mb-12" />

        {/* Content blocks */}
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>

        {/* Interest form */}
        <div className="mt-16 h-64 bg-gray-200 rounded-2xl" />
      </div>
    </main>
  )
}
