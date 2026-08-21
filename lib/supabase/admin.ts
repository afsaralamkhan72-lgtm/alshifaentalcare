import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client that bypasses RLS.
 *
 * This is used ONLY by the patient portal, which has no login: the
 * access code in the URL is the credential. Every query made with this
 * client must filter by that code and select only the columns the
 * patient is allowed to see.
 *
 * NEVER import this into a 'use client' file — the key must not reach
 * the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
