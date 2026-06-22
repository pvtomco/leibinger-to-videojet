import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Pinged by Vercel Cron (see vercel.json) to keep the free Supabase project from
// pausing after ~7 days of inactivity. It runs one tiny database query — that's
// enough to count as activity. (RLS returns 0 rows for this anonymous request,
// which is fine: the point is simply that the database receives a query.)
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, reason: 'supabase not configured' });
  }
  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from('conversions').select('id').limit(1);
    return Response.json({
      ok: !error,
      pingedAt: new Date().toISOString(),
      error: error?.message ?? null,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) });
  }
}
