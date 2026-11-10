import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FieldHint } from '@/features/events/dialogs/EventFormParts';
import { useLinkGuestEmail, useTrialStatus } from '@/tanstack/trials';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { MailCheck, ShieldAlert } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { trialDaysLeft } from './trialPeriod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Noch 2 von 3 Probetrainings" for one group the user is trying out. */
const TrialStatusCard = ({ group }: { group: GroupWithUserRole }) => {
  const { t } = useTranslation();
  const { data: status, isLoading } = useTrialStatus(group.id);
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => Date.now());

  if (isLoading || !status) return null;

  const daysLeft = trialDaysLeft(status.trial_started_at, now);
  const left = status.event_limit === null ? null : Math.max(status.event_limit - status.events_used, 0);

  return (
    <section aria-label={t('trials.home.title', { group: group.name })} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{group.name}</div>
          <h2 className="text-sm font-semibold">
            {left === null ? t('trials.home.titleNoLimit') : t('trials.home.left', { count: left, total: status.event_limit })}
          </h2>
        </div>
        {daysLeft !== null && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {daysLeft > 0 ? t('groups.trialDaysLeft', { count: daysLeft }) : t('groups.trialExpiring')}
          </span>
        )}
      </div>
      {status.event_limit !== null && (
        <div
          role="progressbar"
          aria-label={t('trials.home.used')}
          aria-valuemin={0}
          aria-valuemax={status.event_limit}
          aria-valuenow={status.events_used}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, (status.events_used / status.event_limit) * 100)}%` }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {left === 0 ? t('trials.home.usedUp') : t('trials.home.hint')}
      </p>
    </section>
  );
};

/** A guest's access lives only on this device: invite them to link an e-mail address. */
const SecureAccountCard = () => {
  const { t } = useTranslation();
  const linkEmail = useLinkGuestEmail();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const invalid = submitted && !EMAIL_PATTERN.test(email.trim());

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) return;
    linkEmail.mutate(address, {
      onSuccess: () => {
        setSentTo(address);
        toast.success(t('trials.secure.sent'));
      },
      onError: (error) => {
        captureException(error);
        toast.error(t('trials.secure.failed'));
      },
    });
  };

  if (sentTo) {
    return (
      <section className="flex gap-3 rounded-xl border bg-card p-4">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('trials.secure.checkMailTitle')}</h2>
          <p className="text-xs break-words text-muted-foreground">{t('trials.secure.checkMail', { email: sentTo })}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('trials.secure.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('trials.secure.description')}</p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="secure-email">{t('auth.email')}</Label>
        <Input
          id="secure-email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={invalid}
          onChange={(e) => setEmail(e.target.value)}
        />
        {invalid && <FieldHint error>{t('trials.secure.invalidEmail')}</FieldHint>}
        <Button type="submit" variant="outline" className="w-full" disabled={linkEmail.isPending}>
          {linkEmail.isPending && <Spinner />}
          {t('trials.secure.submit')}
        </Button>
      </form>
    </section>
  );
};

/** On the home page: how much of each trial is left, and for guests the way to keep their access. */
export const TrialHomeSection = () => {
  const { user } = useGrants();
  // Guests are the only accounts without an e-mail address; linking one (confirmed) copies it to the profile.
  const isGuest = !user.email;
  const trialGroups = (user.groups as GroupWithUserRole[]).filter((g) => g.user_role === 'trial');

  if (trialGroups.length === 0 && !isGuest) return null;

  return (
    <div className="flex flex-col gap-3">
      {trialGroups.map((group) => (
        <TrialStatusCard key={group.id} group={group} />
      ))}
      {isGuest && <SecureAccountCard />}
    </div>
  );
};
