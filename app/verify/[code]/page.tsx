import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Verify | ${CLINIC.name}`, robots: { index: false, follow: false } }

/** Bill ya nuskhe par chhape QR ka jawab: sirf "asli hai" ya "record nahi mila". Koi tafseel nahi. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('verify_document', { p_code: code })
  const r = (data ?? { ok: false }) as { ok: boolean; name?: string | null; logo?: string | null }
  const name = r.name || CLINIC.name
  return (
    <main className="flex min-h-screen items-center justify-center bg-clinic-mint/40 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-clinic-ink/10">
        {r.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.logo} alt="" className="mx-auto mb-3 h-16 w-16 object-contain" />
        )}
        <p className="font-display text-xl font-semibold text-clinic-ink">{name}</p>
        {r.ok ? (
          <>
            <div aria-hidden className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl text-emerald-600">✓</div>
            <p role="status" className="mt-4 text-2xl font-bold text-emerald-700">Ye asli hai</p>
          </>
        ) : (
          <>
            <div aria-hidden className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-5xl text-red-600">✕</div>
            <p role="status" className="mt-4 text-2xl font-bold text-red-700">Ye record nahi mila</p>
          </>
        )}
      </div>
    </main>
  )
}
