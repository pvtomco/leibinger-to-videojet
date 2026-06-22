import { updateSession } from '@/lib/supabase/session';

// Next.js 16: the old "middleware" convention is now "proxy".
export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // run on everything except static assets / images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
