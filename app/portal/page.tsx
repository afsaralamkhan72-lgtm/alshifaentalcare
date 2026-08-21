import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'My Record | Al Shifa Health Care',
  robots: { index: false, follow: false },
}

export default async function PortalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  async function openRecord(formData: FormData) {
    'use server'
    const raw = String(formData.get('code') ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')

    if (!raw) redirect('/portal?error=1')
    redirect(`/portal/${encodeURIComponent(raw)}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-clinic-teal px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8">
        <p className="font-display text-xl font-semibold text-clinic-ink">Al Shifa Health Care</p>
        <p className="mt-1 text-sm text-clinic-ink/50">
          Apna record dekhne ke liye wo code likhein jo aap ko WhatsApp par bheja gaya tha.
        </p>

        <form action={openRecord} className="mt-6">
          <label className="text-sm font-medium text-clinic-ink">Access Code</label>
          <input
            name="code"
            required
            autoCapitalize="none"
            placeholder="chand-gulab-noor-47"
            className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2.5 text-sm outline-none focus:border-clinic-teal"
          />

          {params.error && (
            <p className="mt-2 text-sm text-red-600">Code likhna zaroori hai.</p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white"
          >
            View My Record
          </button>
        </form>

        <p className="mt-5 text-xs text-clinic-ink/40">
          Code na mile to clinic par raabta karein: 0342-2078639
        </p>

        <Link href="/" className="mt-4 block text-xs text-clinic-teal hover:underline">
          ← Website par wapas
        </Link>
      </div>
    </div>
  )
}
