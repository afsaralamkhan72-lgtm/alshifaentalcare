'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ImageUploader from './ImageUploader'

type FieldType = 'text' | 'textarea' | 'select' | 'image' | 'number' | 'checkbox'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  bucket?: string
  folder?: string
  required?: boolean
}

interface Props {
  table: string
  title: string
  hint?: string
  fields: FieldDef[]
  rows: Record<string, unknown>[]
  displayKey: string
  subtitleKey?: string
}

export default function CMSContentManager({
  table,
  title,
  hint,
  fields,
  rows,
  displayKey,
  subtitleKey,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = form[f.key]
      if (f.type === 'number') payload[f.key] = v === '' || v == null ? 0 : Number(v)
      else if (f.type === 'checkbox') payload[f.key] = Boolean(v)
      else payload[f.key] = v === '' ? null : (v ?? null)
    }

    const supabase = createClient()
    const { error: insertError } = await supabase.from(table).insert(payload)

    setSaving(false)
    if (insertError) {
      setError('Save nahi hua: ' + insertError.message)
      return
    }

    setForm({})
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Pakka delete karna hai?')) return
    setBusyId(id)
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  async function toggleField(id: string, key: string, current: boolean) {
    setBusyId(id)
    const supabase = createClient()
    await supabase.from(table).update({ [key]: !current }).eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-clinic-ink">{title}</p>
          {hint && <p className="mt-1 text-xs text-clinic-ink/50">{hint}</p>}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
        >
          + Add
        </button>
      </div>

      <div className="mt-4 divide-y divide-clinic-teal/10">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-clinic-ink/40">Abhi koi entry nahi hai.</p>
        ) : (
          rows.map((row) => {
            const id = String(row.id)
            const hasApproval = 'is_approved' in row
            const hasPublished = 'is_published' in row

            return (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-clinic-ink">
                    {String(row[displayKey] ?? '—')}
                  </p>
                  {subtitleKey && row[subtitleKey] != null && (
                    <p className="truncate text-xs text-clinic-ink/50">{String(row[subtitleKey])}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasApproval && (
                    <button
                      onClick={() => toggleField(id, 'is_approved', Boolean(row.is_approved))}
                      disabled={busyId === id}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-mint text-clinic-ink/50'
                      }`}
                    >
                      {row.is_approved ? 'Approved' : 'Approve'}
                    </button>
                  )}
                  {hasPublished && (
                    <button
                      onClick={() => toggleField(id, 'is_published', Boolean(row.is_published))}
                      disabled={busyId === id}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-mint text-clinic-ink/50'
                      }`}
                    >
                      {row.is_published ? 'Published' : 'Publish'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(id)}
                    disabled={busyId === id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Add — {title}</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 grid gap-3">
              {fields.map((f) => {
                if (f.type === 'image') {
                  return (
                    <ImageUploader
                      key={f.key}
                      label={f.label}
                      bucket={f.bucket ?? 'media'}
                      folder={f.folder ?? table}
                      value={(form[f.key] as string) ?? null}
                      onChange={(url) => set(f.key, url)}
                    />
                  )
                }

                if (f.type === 'select') {
                  return (
                    <div key={f.key}>
                      <label className="text-sm font-medium text-clinic-ink">{f.label}</label>
                      <select
                        required={f.required}
                        value={(form[f.key] as string) ?? ''}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select...</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (f.type === 'textarea') {
                  return (
                    <div key={f.key}>
                      <label className="text-sm font-medium text-clinic-ink">{f.label}</label>
                      <textarea
                        required={f.required}
                        rows={3}
                        value={(form[f.key] as string) ?? ''}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )
                }

                if (f.type === 'checkbox') {
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm text-clinic-ink">
                      <input
                        type="checkbox"
                        checked={Boolean(form[f.key])}
                        onChange={(e) => set(f.key, e.target.checked)}
                        className="h-4 w-4 accent-clinic-teal"
                      />
                      {f.label}
                    </label>
                  )
                }

                return (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-clinic-ink">{f.label}</label>
                    <input
                      required={f.required}
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={(form[f.key] as string) ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )
              })}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
