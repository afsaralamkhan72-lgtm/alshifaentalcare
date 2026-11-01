'use client'

import ToothChart from './visit/ToothChart'

/** Lab form ke liye: wohi chart (sirf daant chunna). Pehle iska apna alag chart tha. */
export default function ToothPicker({ selected, onChange }: { selected: string[]; onChange: (teeth: string[]) => void }) {
  return <ToothChart age={null} selected={selected} onSelect={(t) => onChange([...t].sort())} canEdit pickOnly />
}
