'use client'

import { useState } from 'react'

export interface PermGroup {
  grp: string
  items: { code: string; label: string }[]
}

/** Ready-made sets, taake har baar sab tick na karna pade. Baad mein koi bhi tick badal sakte hain. */
const PRESETS: { name: string; codes: string[] }[] = [
  {
    name: 'Receptionist',
    codes: [
      'patients.view', 'patients.create', 'patients.edit',
      'appointments.view', 'appointments.manage',
      'lab.view', 'lab.manage', 'inventory.view',
    ],
  },
  {
    name: 'Receptionist + Bills dekhna',
    codes: [
      'patients.view', 'patients.create', 'patients.edit',
      'appointments.view', 'appointments.manage',
      'lab.view', 'lab.manage', 'inventory.view', 'billing.view',
    ],
  },
  {
    name: 'Dental Assistant',
    codes: [
      'patients.view', 'appointments.view', 'clinical.view', 'clinical.edit',
      'prescriptions.view', 'lab.view', 'lab.manage', 'inventory.view',
    ],
  },
  { name: 'Khali (kuch nahi)', codes: [] },
]

export default function PermissionPicker({
  groups,
  defaultChecked,
}: {
  groups: PermGroup[]
  defaultChecked: string[]
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked))

  function toggle(code: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-clinic-ink/60">Jaldi set karein:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setChecked(new Set(p.codes))}
            className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold text-clinic-teal"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.grp} className="rounded-xl border border-clinic-teal/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-ink/50">{g.grp}</p>
            <div className="mt-2 grid gap-1.5">
              {g.items.map((it) => (
                <label key={it.code} className="flex items-start gap-2 text-sm text-clinic-ink">
                  <input
                    type="checkbox"
                    name="perm"
                    value={it.code}
                    checked={checked.has(it.code)}
                    onChange={() => toggle(it.code)}
                    className="mt-0.5"
                  />
                  <span>{it.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
