'use client'

import { toothLabel, toothName } from '@/lib/teeth'

type Spot = [tooth: string, x0: number, x1: number, only?: 'L']
interface Arch {
  img: string
  w: number
  h: number
  upper: boolean
  y0: number
  y1: number
  left: Spot[]
  right: Spot[]
}

// x ki hadein asli tasveer ke pixel mein (tasveer ki chaudai w). Jo daant do hisson mein dikhta hai uski do entry hain.
export const ARCHES: Record<'adultUpper' | 'adultLower' | 'kidsUpper' | 'kidsLower', Arch> = {
  // Har daant ki hadd (x, y) tasveer ke pixel mein. Adult tasveer: asli x + 16 (khali kinara).
  adultUpper: {
    img: '/teeth/adult-upper.jpg', w: 1704, h: 317, upper: true, y0: 24, y1: 292,
    left: [['18', 26, 141], ['17', 141, 261], ['16', 261, 341], ['15', 341, 428], ['14', 428, 534], ['13', 534, 624], ['12', 624, 728], ['11', 728, 851]],
    right: [['21', 854, 976], ['22', 976, 1078], ['23', 1078, 1168], ['24', 1168, 1274], ['25', 1274, 1364], ['26', 1364, 1448], ['27', 1448, 1551], ['28', 1551, 1666]],
  },
  adultLower: {
    img: '/teeth/adult-lower.jpg', w: 1704, h: 330, upper: false, y0: 22, y1: 300,
    left: [['48', 26, 166], ['47', 166, 291], ['46', 291, 416], ['45', 416, 526], ['44', 526, 624], ['43', 624, 714], ['42', 714, 784], ['41', 784, 851]],
    right: [['31', 854, 924], ['32', 924, 996], ['33', 996, 1081], ['34', 1081, 1178], ['35', 1178, 1284], ['36', 1284, 1416], ['37', 1416, 1516], ['38', 1516, 1666]],
  },
  // Bachon ke daant (A-E): doodh ke daant ki tasveer, wahi tarika. Jo daant tasveer mein do hisson mein hai uski do entry hain.
  kidsUpper: {
    img: '/teeth/kids-upper.jpg', w: 1704, h: 300, upper: true, y0: 22, y1: 268,
    left: [['55', 31, 201], ['54', 201, 361], ['53', 361, 521], ['52', 521, 671], ['51', 671, 851]],
    right: [['61', 854, 1031], ['62', 1031, 1181], ['63', 1181, 1336], ['64', 1336, 1496], ['65', 1496, 1666]],
  },
  kidsLower: {
    img: '/teeth/kids-lower.jpg', w: 1704, h: 312, upper: false, y0: 22, y1: 284,
    left: [['85', 41, 221], ['84', 221, 381], ['83', 381, 526], ['82', 526, 661], ['81', 661, 761], ['81', 761, 851]],
    right: [['71', 854, 946], ['71', 946, 1046], ['72', 1046, 1181], ['73', 1181, 1326], ['74', 1326, 1486], ['75', 1486, 1666]],
  },
}

export interface ToothInfo {
  sel: boolean
  fill?: string
  ghost?: boolean
  cond?: string
  badge?: string
}

export default function ArchChart({
  kind,
  canEdit,
  info,
  onToggle,
}: {
  kind: keyof typeof ARCHES
  canEdit: boolean
  info: (t: string) => ToothInfo
  onToggle: (t: string) => void
}) {
  const a = ARCHES[kind]
  const all = [...a.left, ...a.right]
  const teeth = [...new Set(all.map((s) => s[0]))]
  const pct = (v: number) => `${(v / a.w) * 100}%`

  const labels = (
    <div className="relative h-7">
      {teeth.map((t) => {
        const sp = all.filter((s) => s[0] === t)
        const c = (Math.min(...sp.map((s) => s[1])) + Math.max(...sp.map((s) => s[2]))) / 2
        const i = info(t)
        return (
          <button
            key={t}
            type="button"
            disabled={!canEdit}
            onClick={() => onToggle(t)}
            aria-label={toothLabel(t)}
            className={`absolute top-0 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-xs font-bold sm:text-sm ${i.sel ? 'bg-sky-600 text-white' : 'text-clinic-ink/70 hover:bg-sky-100'}`}
            style={{ left: pct(Math.min(Math.max(c, 14), a.w - 10)) }}
          >
            {toothName(t)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div>
      {a.upper && labels}
      <div className="relative">
        {/* Tasveer apni asli nisbat (aspect ratio) mein, na kati hui na khichi hui: chaudai 100%, unchai khud */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.img} alt="" width={a.w} height={a.h} className="block h-auto w-full max-w-full select-none object-contain" draggable={false} />
        {all.filter((sp) => sp[3] !== 'L').map(([t, x0, x1], idx) => {
          const i = info(t)
          return (
            <button
              key={`${t}-${idx}`}
              type="button"
              disabled={!canEdit}
              onClick={() => onToggle(t)}
              aria-pressed={i.sel}
              aria-label={`${toothLabel(t)}${i.cond ? ' ' + i.cond : ''}`}
              title={`${toothLabel(t)}${i.cond ? ' · ' + i.cond : ''}`}
              className={`absolute rounded-[28%] outline-none transition-transform duration-150 hover:bg-sky-300/20 focus-visible:ring-2 focus-visible:ring-sky-500 ${
                i.sel ? 'z-10 scale-[1.07] bg-sky-400/25 ring-2 ring-sky-500 shadow-[0_0_14px_rgba(23,105,210,0.55)]' : ''
              }`}
              style={{
                left: pct(x0 + 1),
                width: pct(x1 - x0 - 2),
                top: `${(a.y0 / a.h) * 100}%`,
                height: `${((a.y1 - a.y0) / a.h) * 100}%`,
              }}
            >
              {i.fill && <span className="absolute inset-0 rounded-[28%]" style={{ backgroundColor: i.fill, opacity: i.ghost ? 0.3 : 0.5, mixBlendMode: 'multiply' }} />}
              {i.badge && (
                <span className="absolute -top-1 right-0 rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-clinic-ink shadow">
                  {i.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {!a.upper && labels}
    </div>
  )
}
