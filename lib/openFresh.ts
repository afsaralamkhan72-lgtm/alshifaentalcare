/**
 * WhatsApp ka message bhejte waqt server se naya bana kar kholna (purana khula page nahi).
 * Pehle khali tab kholte hain taake phone/browser popup na roke, phir link bhar dete hain.
 */
export async function openFresh(endpoint: string): Promise<void> {
  const w = typeof window !== 'undefined' ? window.open('', '_blank') : null
  try {
    const r = await fetch(endpoint, { cache: 'no-store' })
    const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string }
    if (!r.ok || !j.url) throw new Error(j.error || 'Message nahi ban saka')
    if (w) w.location.href = j.url
    else window.location.href = j.url
  } catch (e) {
    if (w) w.close()
    throw e
  }
}
