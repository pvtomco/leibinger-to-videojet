import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isAllowedEmail } from '@/lib/domain';

// Refreshes the Supabase session on every request and enforces access:
//  - not signed in  -> redirect to /login
//  - signed in but not @tomco.co.th -> sign out + /login?error=domain
// Called from the root proxy.js (Next.js 16 renamed "middleware" -> "proxy").
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Backend not configured yet -> let everything through (local converter mode).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/keepalive');

  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    const u = request.nextUrl.clone();
    u.pathname = '/login';
    u.searchParams.set('error', 'domain');
    return NextResponse.redirect(u);
  }

  if (!user && !isPublic) {
    const u = request.nextUrl.clone();
    u.pathname = '/login';
    return NextResponse.redirect(u);
  }

  return response;
}
