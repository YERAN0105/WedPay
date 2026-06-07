export default function DashboardLoading() {
  return (
    <div className="px-4 py-4 space-y-4 pb-8 animate-pulse">
      <div className="h-28 rounded-2xl bg-stone-100" />
      <div className="h-32 rounded-2xl bg-stone-100" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-36 rounded-2xl bg-stone-100" />
        <div className="h-36 rounded-2xl bg-stone-100" />
      </div>
      <div className="h-40 rounded-2xl bg-stone-100" />
      <div className="h-32 rounded-2xl bg-stone-100" />
    </div>
  )
}
