'use client'

import { useRouter } from 'next/navigation'

export default function BackupPanel({ last }: { last: string | null }) {
  const router = useRouter()
  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Data ki copy (backup)</h2>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Poora patient record, bills, payments aur appointments ki aik file apne computer par utarein. Ye sirf padhta hai, kuch badalta nahi. Haftay mein aik dafa le len.
      </p>
      <p className="mt-2 text-sm">
        Aakhri copy: <span className="font-semibold">{last ?? 'abhi tak nahi li'}</span>
      </p>
      <a
        href="/api/backup"
        onClick={() => setTimeout(() => router.refresh(), 4000)}
        className="mt-3 inline-block rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white"
      >
        Backup download karein
      </a>
      <p className="mt-3 text-xs text-clinic-ink/50">Ye file mein patients ka zaati data hota hai — kisi ko na bhejein, sirf mehfooz jagah rakhein. Email par bhejna yahan se mumkin nahi.</p>
    </div>
  )
}
