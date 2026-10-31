import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Sirf staff panel par login/session check. Website ke public pages par is ki zaroorat nahi
// (pehle har public page par bhi Supabase ko aik call jati thi).
export const config = {
  matcher: ['/admin/:path*'],
}
