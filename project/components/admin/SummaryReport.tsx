'use client'

import { money, fmtDate } from '@/lib/karachi'

export interface ReportData {
  from: string
  to: string
  income: number
  expense: number
  income_by_method: Record<string, number>
  income_by_doctor: Record<string, number>
  expense_by_category: Record<string, number>
  by_day: { date: string; income: number | null; expense: number | null }[]
  invoices_count: number
  invoices_total: number
  new_patients: number
}

function Table({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, r) => s + r[1], 0) || 1
  return (
    <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
      <p className="font-display font-semibold text-clinic-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm">
        {rows.length === 0 && <p className="text-clinic-ink/50">Koi record nahi.</p>}
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between">
              <span className="capitalize text-clinic-ink/70">{k}</span>
              <span className="font-semibold text-clinic-ink">{money(v)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-clinic-mint">
              <div className="h-1.5 rounded-full bg-clinic-teal" style={{ width: `${Math.max(2, (v / total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function SummaryReport({ d }: { d: ReportData }) {
  const net = Number(d.income) - Number(d.expense)

  function csv() {
    const lines: string[] = ['Tareekh,Income,Kharcha']
    for (const r of d.by_day) lines.push(`${r.date},${r.income ?? 0},${r.expense ?? 0}`)
    lines.push('', 'Kharche ki category,Raqam')
    for (const [k, v] of Object.entries(d.expense_by_category)) lines.push(`"${k.replace(/"/g, '""')}",${v}`)
    lines.push('', 'Doctor,Income')
    for (const [k, v] of Object.entries(d.income_by_doctor)) lines.push(`"${k.replace(/"/g, '""')}",${v}`)
    lines.push('', `Kul income,${d.income}`, `Kul kharcha,${d.expense}`, `Munafa,${net}`)
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `al-shifa-report-${d.from}_${d.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-clinic-ink/60">{fmtDate(d.from)} se {fmtDate(d.to)}</p>
        <div className="flex gap-2">
          <button onClick={csv} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">CSV (Excel)</button>
          <button onClick={() => window.print()} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Print / PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Kul income" value={money(d.income)} tone="green" />
        <Card label="Kul kharcha" value={money(d.expense)} tone="red" />
        <Card label="Munafa (income − kharcha)" value={money(net)} tone={net >= 0 ? 'green' : 'red'} />
        <Card label="Invoices" value={`${d.invoices_count} · ${money(d.invoices_total)}`} />
      </div>
      <p className="text-xs text-clinic-ink/50">Naye mareez: {d.new_patients}. Ye cash-basis hisaab hai (jo paisa aaya aur gaya).</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Table title="Income, ada ke tareeqe se" data={d.income_by_method} />
        <Table title="Income, doctor ke hisaab se" data={d.income_by_doctor} />
        <Table title="Kharcha, category ke hisaab se" data={d.expense_by_category} />
      </div>
    </div>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const c = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-clinic-ink'
  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
      <p className={`font-display text-lg font-semibold ${c}`}>{value}</p>
      <p className="mt-1 text-xs text-clinic-ink/50">{label}</p>
    </div>
  )
}
