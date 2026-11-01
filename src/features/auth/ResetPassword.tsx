import { supabase } from '@/lib/supabase';
import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { TENANT_LOGO } from '@/utils';
import { captureException } from '@sentry/react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';

type Phase = 'verifying' | 'ready' | 'invalid' | 'done';

/**
 * Landing page for the password-recovery email link.
 *
 * The client runs with `detectSessionInUrl: false`, so the recovery token is NOT picked up
 * automatically — we parse it here. Supabase (implicit flow) redirects to
 * `…/auth/reset-password#access_token=…&refresh_token=…&type=recovery`; we establish that
 * session, then let the user set a new password via `updateUser`.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const run = async () => {
      // 1) Error handed back in the hash (e.g. expired link).
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get('error')) {
        setError(hashParams.get('error_description')?.replace(/\+/g, ' ') ?? 'Der Link ist ungültig oder abgelaufen.');
        setPhase('invalid');
        return;
      }

      // 2) Implicit flow: tokens in the hash → establish the recovery session.
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          captureException(error);
          setError('Der Link ist ungültig oder abgelaufen.');
          setPhase('invalid');
          return;
        }
        // Drop the token from the URL so it isn't left in history.
        window.history.replaceState(null, '', window.location.pathname);
        setPhase('ready');
        return;
      }

      // 3) PKCE flow fallback: ?code=… in the query string.
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          captureException(error);
          setError('Der Link ist ungültig oder abgelaufen.');
          setPhase('invalid');
          return;
        }
        window.history.replaceState(null, '', window.location.pathname);
        setPhase('ready');
        return;
      }

      // 4) No token, but maybe a recovery session already exists (e.g. page reload).
      const { data } = await supabase.auth.getSession();
      setPhase(data.session ? 'ready' : 'invalid');
      if (!data.session) setError('Kein gültiger Zurücksetzen-Link. Bitte fordere einen neuen an.');
    };
    run();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = form.get('password')?.toString() ?? '';
    const repeat = form.get('repeat')?.toString() ?? '';

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen beinhalten.');
      return;
    }
    if (password !== repeat) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      captureException(error);
      setError(error.message);
      return;
    }
    setPhase('done');
  };

  return (
    <Card className="z-1 w-full border-none shadow-md sm:max-w-lg">
      <CardHeader className="gap-6">
        <div className="flex justify-center gap-2.5">
          <img src={TENANT_LOGO} className="max-w-32 max-h-32 object-cover" alt="" />
        </div>
        <CardTitle className="text-2xl">Neues Passwort festlegen</CardTitle>
      </CardHeader>
      <CardContent>
        {phase === 'verifying' && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Spinner /> Link wird geprüft…
          </div>
        )}

        {phase === 'invalid' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">{error}</p>
            <Button className="w-full" onClick={() => navigate('/auth/forgot-password')}>
              Neuen Link anfordern
            </Button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm">Dein Passwort wurde geändert. 🎉</p>
            <Button className="w-full" onClick={() => navigate('/')}>Zur App</Button>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={submit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <div className="relative">
                  <Input id="password" name="password" type={show ? 'text' : 'password'} required className="pr-9" />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="text-muted-foreground absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat">Passwort wiederholen</Label>
                <Input id="repeat" name="repeat" type={show ? 'text' : 'password'} required />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner />}
                Passwort speichern
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ResetPassword;
