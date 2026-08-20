interface TickerProps {
  items: string[]
}

// Pure-CSS marquee — no JS animation library, so it stays light and fast.
// Duplicated list = seamless infinite loop. Pauses on hover and respects
// prefers-reduced-motion globally (see app/globals.css).
export default function Ticker({ items }: TickerProps) {
  const loopItems = [...items, ...items]

  return (
    <div className="overflow-hidden border-y border-clinic-teal/10 bg-clinic-mint py-2.5">
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {loopItems.map((item, i) => (
          <span key={i} className="whitespace-nowrap text-sm font-medium text-clinic-teal">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
