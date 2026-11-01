import { NextResponse } from 'next/server'

/**
 * Roz subah aik dafa chalta hai (vercel.json ka cron): Supabase ko jagaye rakhta hai, taake free project
 * 7 din ki khamoshi se so na jaye aur subah ka pehla click sust na ho. Koi data nahi padhta.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 200 })
  try {
    const r = await fetch(`${url}/rest/v1/`, { headers: { apikey: key }, cache: 'no-store' })
    return NextResponse.json({ ok: r.ok })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
