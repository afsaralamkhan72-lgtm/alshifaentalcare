import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Login ki jaanch. Naye Supabase mein getClaims() token ko khud (bina network call ke) jaanchta hai;
  // purane project ya purani library mein khud-ba-khud wohi purana getUser() chalta hai (is se kuch kamzor nahi hota).
  // Asal hifazat database (RLS) aur layout ka my_staff() pehle ki tarah karte hain.
  let user: unknown = null
  const auth = supabase.auth as unknown as { getClaims?: () => Promise<{ data: { claims?: { sub?: string } } | null; error: unknown }> }
  if (typeof auth.getClaims === 'function') {
    const { data, error } = await auth.getClaims()
    user = !error && data?.claims?.sub ? data.claims.sub : null
  } else {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // Guard: only logged-in staff (admin/doctor/receptionist) can reach /admin/*
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return response
}
