import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/domain';

// Google redirects here after sign-in. We exchange the code for a session and
// enforce the @tomco.co.th domain (the real gate — a Google "hd" hint alone is
// not trustworthy).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // On Vercel, build redirect URLs from the forwarded host (behind a proxy).
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isAllowedEmail(data?.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${base}/login?error=domain`);
      }
      return NextResponse.redirect(`${base}/`);
    }
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
