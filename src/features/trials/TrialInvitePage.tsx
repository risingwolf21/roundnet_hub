import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FieldHint } from '@/features/events/dialogs/EventFormParts';
import { useRedeemTrialInvite, useSignInAsGuest, useTrialInviteInfo } from '@/tanstack/trials';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { BRANDING, TENANT_LOGO } from '@/utils';
import { captureException } from '@sentry/react';
import { CalendarCheck, Clock, LinkIcon } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useApplication } from '../auth/ApplicationContext';

// Signing in as a guest restarts the app with the new session, which remounts this page. The
// name is kept here so the page can finish joining the group once the guest is signed in.
const PENDING_KEY = 'trial-invite-pending';

const readPending = (token: string): string | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    const pending = raw ? (JSON.parse(raw) as { token: string; name: string }) : null;
    return pending?.token === token ? pending.name : null;
  } catch {
    return null;
  }
};

const writePending = (token: string, name: string | null) => {
  try {
    if (name === null) sessionStorage.removeItem(PENDING_KEY);
    else sessionStorage.setItem(PENDING_KEY, JSON.stringify({ token, name }));
  } catch {
    // Storage unavailable: the guest then joins by tapping the button once more.
  }
};

const TrialInvitePage = () => {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useApplication();
  const { data: invite, isLoading } = useTrialInviteInfo(token);
  const signIn = useSignInAsGuest();
  const redeem = useRedeemTrialInvite();
  const [name, setName] = useState(() => readPending(token) ?? '');
  const [submitted, setSubmitted] = useState(false);
  const autoJoined = useRef(false);

  const join = useCallback(
    (guestName?: string) =>
      redeem.mutate(
        { token, name: guestName },
        {
          onSuccess: () => {
            writePending(token, null);
            navigate('/home', { replace: true });
          },
          onError: (err) => {
            writePending(token, null);
            captureException(err);
          },
        }
      ),
    [redeem, token, navigate]
  );

  // Back after signing in as a guest: join the group with the name they typed.
  useEffect(() => {
    if (!user || autoJoined.current) return;
    const pending = readPending(token);
    if (pending === null) return;
    autoJoined.current = true;
    join(pending);
  }, [user, token, join]);

  const startAsGuest = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const trimmed = name.trim();
    if (!trimmed) return;
    writePending(token, trimmed);
    signIn.mutate(
      { name: trimmed, language: i18n.resolvedLanguage ?? 'de' },
      {
        onError: (err) => {
          writePending(token, null);
          captureException(err);
        },
      }
    );
  };

  // Inline, not a toast: the toaster lives in the main layout, which this page is not part of.
  const error = redeem.isError ? t('trials.invite.joinFailed') : signIn.isError ? t('trials.invite.signInFailed') : null;
  const alreadyMember = !!user && (user.groups as GroupWithUserRole[]).some((g) => g.id === invite?.group_id && g.user_role !== 'joinRequested');
  const busy = signIn.isPending || redeem.isPending || (!!user && readPending(token) !== null);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10 pt-safe-top pb-safe-bottom">
      <Card className="z-1 w-full border-none shadow-md sm:max-w-md">
        <CardHeader className="items-center gap-3 text-center">
          <div className="flex justify-center">
            <img src={TENANT_LOGO} alt="" className="max-h-20 max-w-20 object-cover" />
          </div>
          <div className="text-xs font-medium text-muted-foreground">{BRANDING.title}</div>
          {isLoading ? null : invite?.valid ? (
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">{t('trials.invite.title')}</CardTitle>
              <CardDescription>{t('trials.invite.invitedTo', { group: invite.group_name })}</CardDescription>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{t('trials.invite.invalidTitle')}</CardTitle>
              <CardDescription>{t('trials.invite.invalidDescription')}</CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}

          {!isLoading && !invite?.valid && (
            <Button className="w-full" variant="outline" onClick={() => navigate('/')}>
              {t('trials.invite.toApp')}
            </Button>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {!isLoading && invite?.valid && (
            <>
              <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarCheck className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t('trials.invite.trainings', { count: invite.event_limit })}</div>
                    <div className="text-xs text-muted-foreground">{t('trials.invite.trainingsHint')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t('trials.invite.period')}</div>
                    <div className="text-xs text-muted-foreground">{t('trials.invite.periodHint')}</div>
                  </div>
                </div>
              </div>

              {alreadyMember ? (
                <Button className="w-full" onClick={() => navigate('/home', { replace: true })}>
                  {t('trials.invite.alreadyMember')}
                </Button>
              ) : user ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">{t('trials.invite.signedInAs', { name: user.displayName })}</p>
                  <Button className="h-11 w-full" disabled={busy} onClick={() => join()}>
                    {busy ? <Spinner /> : <LinkIcon aria-hidden />}
                    {t('trials.invite.start')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={startAsGuest} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="trial-name">{t('trials.invite.nameLabel')}</Label>
                    <Input
                      id="trial-name"
                      autoComplete="given-name"
                      value={name}
                      maxLength={60}
                      aria-invalid={submitted && !name.trim()}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <FieldHint error={submitted && !name.trim()}>
                      {submitted && !name.trim() ? t('trials.invite.nameRequired') : t('trials.invite.nameHint')}
                    </FieldHint>
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={busy}>
                    {busy && <Spinner />}
                    {t('trials.invite.start')}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">{t('trials.invite.noAccountNeeded')}</p>
                  <p className="text-center text-sm">
                    {t('trials.invite.haveAccount')}{' '}
                    <a
                      href="/auth/login"
                      className="underline underline-offset-4"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/auth/login', { state: { path: `/probe/${token}` } });
                      }}
                    >
                      {t('trials.invite.login')}
                    </a>
                  </p>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialInvitePage;
