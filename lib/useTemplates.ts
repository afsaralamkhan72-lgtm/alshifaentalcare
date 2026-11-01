'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mapTemplates, type Tpl } from '@/lib/messageTemplates'

/** Settings -> Messages ke text (client components ke liye). Na milen to default text chalta hai. */
export function useTemplates(): Tpl {
  const [tpl, setTpl] = useState<Tpl>({})
  useEffect(() => {
    createClient()
      .from('message_templates')
      .select('key, body')
      .then(({ data }) => setTpl(mapTemplates(data as { key: string; body: string }[] | null)))
  }, [])
  return tpl
}
