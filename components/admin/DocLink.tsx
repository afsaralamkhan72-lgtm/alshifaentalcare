'use client'

import { createClient } from '@/lib/supabase/client'

/** Private photo ko 5 minute ke link se kholta hai. */
export default function DocLink({ path, label = 'Photo dekhein' }: { path: string; label?: string }) {
  return (
    <button type="button" className="text-xs text-clinic-teal underline" onClick={async () => {
      const { data, error } = await createClient().storage.from('business-docs').createSignedUrl(path, 300)
      if (error || !data) return alert('Photo nahi khul saki')
      window.open(data.signedUrl, '_blank', 'noopener')
    }}>{label}</button>
  )
}
