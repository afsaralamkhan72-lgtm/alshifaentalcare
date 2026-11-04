'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { PrintLayout } from '@/lib/printLayout'

/**
 * Agar letterhead upload hai to poora kaghaz (A4) usi par aata hai aur matn upar/neeche ke hisse chhor kar beech mein.
 * Matn zyada ho to software khud chhota kar ke aik safhe mein samata hai. Letterhead na ho to bas andar ka matn dikhata hai.
 */
export default function LetterheadFrame({ layout, id = 'print-sheet', children }: { layout: PrintLayout; id?: string; children: React.ReactNode }) {
  const lh = layout.letterhead
  const inner = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const availH = 297 - lh.top - lh.bottom // mm
  useLayoutEffect(() => {
    if (!lh.data || !inner.current) return
    const mmPx = 96 / 25.4
    inner.current.style.zoom = '1'
    const h = inner.current.scrollHeight
    const avail = availH * mmPx
    setZoom(h > avail ? Math.max(0.55, Math.floor((avail / h) * 100) / 100) : 1)
  }, [lh.data, availH, children, layout.scale])

  if (!lh.data) return <div id={id}>{children}</div>
  return (
    <div className="overflow-x-auto">
      <style>{`
        #${id}, #${id} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { @page { size: A4; margin: 0; } body * { visibility: hidden; } #${id}, #${id} * { visibility: visible; } #${id} { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; box-shadow: none !important; width: 210mm !important; } }
      `}</style>
      <div
        id={id}
        style={{
          width: '210mm',
          height: '297mm',
          position: 'relative',
          overflow: 'hidden',
          background: `#fff url(${lh.data}) center / 100% 100% no-repeat`,
          margin: '0 auto',
          boxShadow: '0 2px 14px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ position: 'absolute', left: `${lh.left}mm`, right: `${lh.right}mm`, top: `${lh.top}mm`, bottom: `${lh.bottom}mm`, overflow: 'hidden' }}>
          <div ref={inner} style={{ zoom }}>{children}</div>
        </div>
      </div>
    </div>
  )
}
