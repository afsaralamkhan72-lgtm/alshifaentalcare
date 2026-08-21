'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ImageUploader from './ImageUploader'

type SettingsMap = Record<string, Record<string, unknown>>

interface Props {
  initial: SettingsMap
}

export default function CMSSettings({ initial }: Props) {
  const [clinic, setClinic] = useState({
    logo_url: '',
    name: '',
    doctor_name: '',
    address: '',
    phone: '',
    whatsapp: '',
    timings: '',
    ...(initial.clinic_info ?? {}),
  } as Record<string, string>)

  const [popup, setPopup] = useState({
    enabled: true,
    delay_seconds: 10,
    title: '',
    message: '',
    button_text: '',
    ...(initial.emergency_popup ?? {}),
  } as Record<string, string | number | boolean>)

  const [hero, setHero] = useState({
    heading: '',
    subheading: '',
    image_url: '',
    show_text: true,
    ...(initial.hero_banner ?? {}),
  } as Record<string, string | boolean>)

  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveAll() {
    setSaving(true)
    setStatus('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const rows = [
      { key: 'clinic_info', value: clinic, updated_by: user?.id ?? null },
      { key: 'emergency_popup', value: popup, updated_by: user?.id ?? null },
      { key: 'hero_banner', value: hero, updated_by: user?.id ?? null },
    ]

    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })

    setSaving(false)
    setStatus(error ? 'Save nahi hua.' : 'Save ho gaya! Website par turant update ho jayega.')
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div className="grid gap-6">
      {/* Clinic Info */}
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <p className="font-display font-semibold text-clinic-ink">Clinic Information</p>
        <p className="mt-1 text-xs text-clinic-ink/50">
          Ye footer, contact page aur poori website par nazar aata hai.
        </p>

        <div className="mt-4">
          <ImageUploader
            label="Clinic Logo"
            bucket="media"
            folder="branding"
            value={clinic.logo_url || null}
            onChange={(url) => setClinic((p) => ({ ...p, logo_url: url ?? '' }))}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['name', 'Clinic Name'],
            ['doctor_name', 'Doctor Name'],
            ['address', 'Address'],
            ['phone', 'Phone (display)'],
            ['whatsapp', 'WhatsApp (923XXXXXXXXX)'],
            ['timings', 'Timings'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-sm font-medium text-clinic-ink">{label}</label>
              <input
                value={clinic[key] ?? ''}
                onChange={(e) => setClinic((p) => ({ ...p, [key]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Emergency Popup */}
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-clinic-ink">Emergency Popup</p>
            <p className="mt-1 text-xs text-clinic-ink/50">
              Website khulne ke baad ye popup dikhta hai.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(popup.enabled)}
              onChange={(e) => setPopup((p) => ({ ...p, enabled: e.target.checked }))}
              className="h-4 w-4 accent-clinic-teal"
            />
            Enabled
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-sm font-medium text-clinic-ink">Delay (seconds)</label>
            <input
              type="number"
              min="1"
              value={Number(popup.delay_seconds)}
              onChange={(e) => setPopup((p) => ({ ...p, delay_seconds: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-clinic-ink">Title</label>
            <input
              value={String(popup.title ?? '')}
              onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-clinic-ink">Message</label>
            <input
              value={String(popup.message ?? '')}
              onChange={(e) => setPopup((p) => ({ ...p, message: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-clinic-ink">Button Text</label>
            <input
              value={String(popup.button_text ?? '')}
              onChange={(e) => setPopup((p) => ({ ...p, button_text: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Hero Banner */}
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <p className="font-display font-semibold text-clinic-ink">Home Page Banner</p>

        <div className="mt-4">
          <ImageUploader
            label="Cover Picture"
            bucket="media"
            folder="banner"
            value={(hero.image_url as string) || null}
            onChange={(url) => setHero((p) => ({ ...p, image_url: url ?? '' }))}
          />
          <p className="mt-1 text-xs text-clinic-ink/50">
            Chaurai zyada wali tasveer behtar rehti hai (jaise 1600 x 600).
          </p>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-clinic-ink">
          <input
            type="checkbox"
            checked={Boolean(hero.show_text)}
            onChange={(e) => setHero((p) => ({ ...p, show_text: e.target.checked }))}
            className="h-4 w-4 accent-clinic-teal"
          />
          Tasveer ke upar likhai aur buttons dikhayein
        </label>
        <p className="ml-6 text-xs text-clinic-ink/50">
          Off karein to sirf cover picture nazar aayegi.
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-sm font-medium text-clinic-ink">Heading</label>
            <input
              value={(hero.heading as string) ?? ''}
              onChange={(e) => setHero((p) => ({ ...p, heading: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-clinic-ink">Subheading</label>
            <textarea
              rows={2}
              value={(hero.subheading as string) ?? ''}
              onChange={(e) => setHero((p) => ({ ...p, subheading: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
        {status && <p className="text-sm text-clinic-ink/60">{status}</p>}
      </div>
    </div>
  )
}
