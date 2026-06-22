import GoogleSignIn from '@/components/GoogleSignIn';
import { ALLOWED_DOMAIN, isSupabaseConfigured } from '@/lib/domain';

// Next 16: searchParams is async.
export default async function LoginPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const error = sp.error;
  const configured = isSupabaseConfigured();

  return (
    <div className="center">
      <div className="loginbox card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/tomco-logo.png" alt="Tomco Automatic Machinery Co., Ltd." />
        <h1>Leibinger → VideoJet</h1>
        <p>
          Tomco internal tool. Sign in with your <strong>@{ALLOWED_DOMAIN}</strong> Google
          account.
        </p>

        {error === 'domain' && (
          <div className="notice">
            That account isn’t an <strong>@{ALLOWED_DOMAIN}</strong> address, so access was
            denied. Please sign in with your company Google account.
          </div>
        )}
        {error === 'auth' && (
          <div className="notice">Sign-in failed or was cancelled. Please try again.</div>
        )}

        {configured ? (
          <GoogleSignIn />
        ) : (
          <div className="notice">
            The backend isn’t set up yet (Supabase keys missing). Sign-in will work once setup
            is complete.
          </div>
        )}
      </div>
    </div>
  );
}
