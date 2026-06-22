// The only email domain allowed to use this app.
export const ALLOWED_DOMAIN = 'tomco.co.th';

export function isAllowedEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}

// True only once the Supabase keys are present (set after Phase 2). Lets the app
// run in "local converter only" mode before the backend is configured.
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
