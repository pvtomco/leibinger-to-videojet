import { isSupabaseConfigured } from '@/lib/domain';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import SignOutButton from '@/components/SignOutButton';

export default async function Home() {
  const configured = isSupabaseConfigured();
  let email = null;
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email || null; // proxy.js redirects unauthenticated users to /login
  }

  return (
    <>
      <header className="appheader">
        <div>
          <h1>Leibinger → VideoJet BMP Converter</h1>
          <div className="sub">Tomco internal tool · converts .job files for VideoJet 1580 / 1880</div>
        </div>
        {configured && email && (
          <div className="who">
            <span>{email}</span>
            <SignOutButton />
          </div>
        )}
      </header>

      <div className="wrap">
        {!configured && (
          <div className="notice">
            Running in <strong>local mode</strong> (login &amp; saving not set up yet).
            Conversions work and can be downloaded — they just won’t be saved to the team
            library until the backend is configured.
          </div>
        )}
        <AppShell canSave={configured && !!email} />
      </div>
    </>
  );
}
