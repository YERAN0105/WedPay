export default function ActivityLoading() {
  return (
    <div className="px-4 py-4 pb-8 animate-pulse">
      <div className="h-7 w-24 rounded-lg bg-stone-100 mb-4" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-20 rounded-full bg-stone-100 shrink-0" />
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden bg-white border border-stone-100">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-stone-50 last:border-0">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-stone-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded-md bg-stone-100 w-3/4" />
              <div className="h-3 rounded-md bg-stone-100 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
