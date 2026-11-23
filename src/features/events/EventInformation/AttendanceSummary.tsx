import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { answerDeadlineExpired, answerNotOpenYet, eventHasStarted, EventsUserView, FullAttendance } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { isBefore } from 'date-fns';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ATTENDING_STATES = ['Attending', 'AttendingAsTrainer', 'AttendingAsTrial'];

/** Spots taken, a quick look at who is in, and when the answer can be changed. */
export const AttendanceSummary = ({
  event,
  attendance,
  showAnswerWindow,
}: {
  event: EventsUserView;
  attendance: FullAttendance[];
  showAnswerWindow: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const dateTimeFormat = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const attending = attendance
    .filter((x) => ATTENDING_STATES.includes(x.state))
    .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1));
  // Only regular attendees take a spot, like `maxAttendeesExceeded`.
  const taken = attendance.filter((x) => x.state === 'Attending').length;
  const max = event.maxAttendees ?? 0;
  const left = Math.max(max - taken, 0);
  const almostFull = left <= 2;

  const firstNames = attending.slice(0, 3).map((x) => (x.user.name ?? '').split(' ')[0]);
  const names = new Intl.ListFormat(lang, { type: 'conjunction' }).format(
    attending.length > 3 ? [...firstNames, t('events.information.andMore', { count: attending.length - 3 })] : firstNames
  );

  const answerWindow = (() => {
    if (!showAnswerWindow || event.isCancelled || eventHasStarted(event)) return null;
    const deadline = event.answerDeadline ? dateTimeFormat.format(new Date(event.answerDeadline)) : null;
    if (answerNotOpenYet(event)) {
      const from = dateTimeFormat.format(new Date(event.answerStart!));
      return {
        warn: false,
        text: deadline
          ? t('events.information.answerWindowFromUntil', { from, until: deadline })
          : t('events.information.answerWindowFrom', { from }),
      };
    }
    if (answerDeadlineExpired(event)) return { warn: true, text: t('events.information.answerWindowClosed', { date: deadline }) };
    if (deadline) return { warn: true, text: t('events.information.answerWindowUntil', { date: deadline }) };
    return { warn: false, text: t('events.information.answerWindowUntilStart', { date: dateTimeFormat.format(new Date(event.startingDateTime)) }) };
  })();

  return (
    <div className="flex flex-col gap-3">
      {max > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums">{t('events.information.spotsTaken', { count: taken, max })}</span>
            <span className={cn('shrink-0 text-xs font-semibold', almostFull ? 'text-foreground' : 'text-muted-foreground')}>
              {left === 0 ? t('events.information.full') : t('events.information.spotsLeft', { count: left })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t('events.information.spotsTaken', { count: taken, max })}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(taken, max)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn('h-full rounded-full', almostFull ? 'bg-warning' : 'bg-primary')}
              style={{ width: `${Math.min(taken / max, 1) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {attending.length > 0 && (
          <AvatarGroup className="shrink-0">
            {attending.slice(0, 4).map((x) => (
              <Avatar key={x.user.id}>
                <AvatarImage src={x.user.avatarUrl || ''} />
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">{getInitials(x.user.name ?? 'User')}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        )}
        <span className="min-w-0 line-clamp-2 text-xs text-muted-foreground">
          {attending.length > 0 ? names : t('events.information.noOneAttending')}
        </span>
      </div>

      {answerWindow && (
        <p className="flex items-center gap-2 text-xs font-medium">
          <Clock className={cn('size-4 shrink-0', answerWindow.warn ? 'text-warning' : 'text-muted-foreground')} aria-hidden="true" />
          <span>{answerWindow.text}</span>
        </p>
      )}
    </div>
  );
};
