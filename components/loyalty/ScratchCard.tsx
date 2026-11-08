'use client'

import { useEffect, useRef, useState } from 'react'

type Res = { status: string; title?: string; kind?: string; value?: number | null; treatments?: string[]; expires_at?: string | null }

const text = (r: Res) =>
  r.kind === 'none' ? 'Is baar koi inaam nahi, agli visit par dobara koshish karein!' :
  r.kind === 'percent' ? `${r.value}% discount` : r.kind === 'amount' ? `Rs. ${r.value} discount` : 'Muft'

export default function ScratchCard() {
  const [state, setState] = useState<'idle' | 'loading' | 'card'>('idle')
  const [avail, setAvail] = useState<boolean | null>(null)
  const [res, setRes] = useState<Res | null>(null)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const cv = useRef<HTMLCanvasElement>(null)

  async function call(peek: boolean): Promise<Res | null> {
    try {
      const r = await fetch('/api/loyalty/scratch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ peek }) })
      return (await r.json()) as Res
    } catch { setErr('Internet check karein.'); return null }
  }

  useEffect(() => {
    void (async () => {
      const r = await call(true)
      if (!r) return
      if (r.status === 'available') setAvail(true)
      else if (r.status === 'played') { setRes(r); setAvail(true) }
      else setAvail(false)
    })()
  }, [])

  async function open() {
    setState('loading')
    const r = res ?? (await call(false))
    if (!r || !['won', 'played'].includes(r.status)) { setState('idle'); setAvail(false); return }
    setRes(r)
    setState('card')
  }

  useEffect(() => {
    if (state !== 'card') return
    const c = cv.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, c.width, c.height)
    g.addColorStop(0, '#b8b8b8'); g.addColorStop(0.5, '#e6e6e6'); g.addColorStop(1, '#a8a8a8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#777'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Yahan ungli se khurchein', c.width / 2, c.height / 2 + 6)
    let down = false
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [(e.clientX - b.left) * (c.width / b.width), (e.clientY - b.top) * (c.height / b.height)] }
    const scratch = (e: PointerEvent) => {
      if (!down) return
      const [x, y] = pos(e)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill()
    }
    const check = () => {
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let clear = 0
      for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++
      if (clear / (d.length / 64) > 0.4) setDone(true)
    }
    const dn = (e: PointerEvent) => { down = true; c.setPointerCapture(e.pointerId); scratch(e) }
    const up = () => { down = false; check() }
    c.addEventListener('pointerdown', dn); c.addEventListener('pointermove', scratch); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up)
    return () => { c.removeEventListener('pointerdown', dn); c.removeEventListener('pointermove', scratch); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up) }
  }, [state])

  if (err) return <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>
  if (!avail) return null
  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
      <p className="font-semibold text-amber-900">🎁 Aaj ka Scratch Card</p>
      {state !== 'card' && (
        <button onClick={open} disabled={state === 'loading'} className="mt-3 rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {res ? 'Apna card dekhein' : 'Card kholein'}
        </button>
      )}
      {state === 'card' && res && (
        <div className="relative mx-auto mt-3 h-36 w-full max-w-xs select-none overflow-hidden rounded-xl bg-white shadow">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
            <p className="text-lg font-bold text-clinic-ink">{res.kind === 'none' ? 'Agli baar' : res.title}</p>
            <p className="mt-1 text-sm text-clinic-ink/70">{text(res)}</p>
            {done && res.kind !== 'none' && <p className="mt-1 text-xs text-emerald-700">Reception ko dikhayein{res.expires_at ? ` · ${res.expires_at.slice(0, 10)} tak` : ''}</p>}
          </div>
          {!done && <canvas ref={cv} width={320} height={144} className="absolute inset-0 h-full w-full touch-none" />}
        </div>
      )}
    </div>
  )
}
