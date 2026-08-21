'use client'

import { localNumber, toothLabel, isWisdom } from '@/lib/teeth'

/** FDI notation, arranged the way a dentist reads a chart (patient's view) */
export const FDI_QUADRANTS = {
  upperRight: ['18', '17', '16', '15', '14', '13', '12', '11'],
  upperLeft: ['21', '22', '23', '24', '25', '26', '27', '28'],
  lowerRight: ['48', '47', '46', '45', '44', '43', '42', '41'],
  lowerLeft: ['31', '32', '33', '34', '35', '36', '37', '38'],
}

interface Props {
  selected: string[]
  onChange: (teeth: string[]) => void
}

export default function ToothPicker({ selected, onChange }: Props) {
  function toggle(tooth: string) {
    onChange(
      selected.includes(tooth) ? selected.filter((t) => t !== tooth) : [...selected, tooth].sort()
    )
  }

  function Row({ teeth }: { teeth: string[] }) {
    return (
      <div className="flex gap-1">
        {teeth.map((t) => {
          const on = selected.includes(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              title={isWisdom(t) ? `${toothLabel(t)} (aqal daarh)` : toothLabel(t)}
              className={`h-9 w-9 shrink-0 rounded-md text-sm font-semibold transition-colors ${
                on
                  ? 'bg-clinic-teal text-white'
                  : isWisdom(t)
                    ? 'bg-clinic-amber/15 text-clinic-ink/70 hover:bg-clinic-teal/20'
                    : 'bg-clinic-mint text-clinic-ink/60 hover:bg-clinic-teal/20'
              }`}
            >
              {localNumber(t)}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-clinic-teal/10 bg-white p-3">
        {/* Upper arch */}
        <div className="mb-1 flex justify-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-clinic-ink/40">
          <span className="w-[19rem] text-center">Upper Right</span>
          <span className="w-px" />
          <span className="w-[19rem] text-center">Upper Left</span>
        </div>
        <div className="flex justify-center gap-3">
          <Row teeth={FDI_QUADRANTS.upperRight} />
          <div className="w-px bg-clinic-teal/20" />
          <Row teeth={FDI_QUADRANTS.upperLeft} />
        </div>

        <div className="my-2 border-t border-dashed border-clinic-teal/20" />

        {/* Lower arch */}
        <div className="flex justify-center gap-3">
          <Row teeth={FDI_QUADRANTS.lowerRight} />
          <div className="w-px bg-clinic-teal/20" />
          <Row teeth={FDI_QUADRANTS.lowerLeft} />
        </div>
        <div className="mt-1 flex justify-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-clinic-ink/40">
          <span className="w-[19rem] text-center">Lower Right</span>
          <span className="w-px" />
          <span className="w-[19rem] text-center">Lower Left</span>
        </div>

        <p className="mt-3 text-center text-[11px] text-clinic-ink/50">
          Wast se shuru, 8 = aqal daarh (wisdom tooth)
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-clinic-ink/50">Selected:</span>
        {selected.length === 0 ? (
          <span className="text-xs text-clinic-ink/40">koi tooth select nahi</span>
        ) : (
          <>
            <span className="rounded-full bg-clinic-teal px-3 py-1 text-xs font-semibold text-white">
              {selected.map(toothLabel).join(', ')}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-red-600 hover:underline"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  )
}
