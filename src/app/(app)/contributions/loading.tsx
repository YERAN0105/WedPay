export default function ContributionsLoading() {
  return (
    <div className="px-4 pt-4 pb-8 animate-pulse">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-20 rounded-2xl bg-stone-100" />
        <div className="h-20 rounded-2xl bg-stone-100" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-stone-100" />
        ))}
      </div>
    </div>
  )
}
