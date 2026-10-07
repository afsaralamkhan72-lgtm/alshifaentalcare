import { createClient } from '@/lib/supabase/server'

interface Links {
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  google_business?: string
}

const ICONS: Record<string, { label: string; path: React.ReactNode }> = {
  facebook: {
    label: 'Facebook',
    path: <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1Z" />,
  },
  instagram: {
    label: 'Instagram',
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" />
      </>
    ),
  },
  tiktok: {
    label: 'TikTok',
    path: (
      <path d="M14 3v10.5a3 3 0 1 1-2.5-2.95V13a1 1 0 1 0 1 1V3h2c.3 2 1.7 3.4 4 3.6v2.1c-1.6-.1-3-.7-4-1.6Z" />
    ),
  },
  youtube: {
    label: 'YouTube',
    path: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="none" strokeWidth="2" />
        <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" />
      </>
    ),
  },
  google_business: {
    label: 'Google',
    path: (
      <path d="M12 11v2.6h4.3c-.2 1.1-1.4 3.2-4.3 3.2A4.8 4.8 0 1 1 12 7.2c1.4 0 2.3.6 2.8 1.1l1.9-1.8A7.5 7.5 0 1 0 12 19.5c4.3 0 7.2-3 7.2-7.3 0-.5 0-.8-.1-1.2H12Z" />
    ),
  },
}

export default async function SocialLinks({
  tone = 'light',
}: {
  /** light = teal icons on light bg, dark = white icons on teal bg */
  tone?: 'light' | 'dark'
}) {
  let links: Links = {}

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'social_links')
      .maybeSingle()
    links = (data?.value ?? {}) as Links
  } catch {
    // koi link nahi
  }

  const entries = Object.entries(links).filter(
    ([key, url]) => url && url.trim() && ICONS[key]
  )

  if (entries.length === 0) return null

  const base =
    tone === 'dark'
      ? 'bg-white/10 text-white hover:bg-white/20'
      : 'bg-clinic-mint text-clinic-teal hover:bg-clinic-teal hover:text-white'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ICONS[key].label}
          title={ICONS[key].label}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${base}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
          >
            {ICONS[key].path}
          </svg>
        </a>
      ))}
    </div>
  )
}
