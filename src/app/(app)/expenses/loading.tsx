export default function ExpensesLoading() {
  return (
    <div className="px-4 pt-4 pb-8 animate-pulse">
      <div className="h-11 rounded-xl bg-stone-100 mb-2" />
      <div className="flex gap-2 mb-4">
        <div className="flex-1 h-9 rounded-lg bg-stone-100" />
        <div className="flex-1 h-9 rounded-lg bg-stone-100" />
        <div className="flex-1 h-9 rounded-lg bg-stone-100" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-stone-100" />
        ))}
      </div>
    </div>
  )
}
