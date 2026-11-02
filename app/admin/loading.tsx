/**
 * Menu par click karte hi ye fauran nazar aata hai (jab tak page ka data aata hai).
 * Pehle click ke baad kuch nahi badalta tha, isliye 1 second bhi bohat lamba lagta tha.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-clinic-teal/10" />
      <div className="mt-2 h-4 w-72 max-w-full rounded bg-clinic-teal/10" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-clinic-teal/10 bg-white" />
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-2xl border border-clinic-teal/10 bg-white" />
        ))}
      </div>
      <span className="sr-only">Load ho raha hai…</span>
    </div>
  )
}
