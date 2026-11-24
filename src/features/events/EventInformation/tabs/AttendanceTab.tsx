import { ListSectionHeader } from '@/components/list/ListParts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { useGrants } from '@/features/auth/GrantsContext';
import { cn } from '@/lib/utils';
import { EventsUserView, FullAttendance } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { isBefore } from 'date-fns';
import { Check, ChevronDown, X } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const AttendeeRow = ({
  attendance,
  name,
  subtitle,
  muted,
  action,
  onOpen,
}: {
  attendance: FullAttendance;
  name: string;
  subtitle?: string | false;
  muted?: boolean;
  action?: React.ReactNode;
  onOpen: () => void;
}) => (
  <div className="flex min-h-12 items-center gap-3">
    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onOpen}>
      <Avatar size="lg" className={cn(muted && 'opacity-70')}>
        <AvatarImage src={attendance.user.avatarUrl || ''} />
        <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? 'User')}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', muted && 'text-muted-foreground')}>{name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </button>
    {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
  </div>
);

const StatTile = ({ value, label, className }: { value: number; label: string; className: string }) => (
  <div className={cn('rounded-lg px-1 py-2.5 text-center', className)}>
    <p className="text-xl font-bold tabular-nums">{value}</p>
    <p className="text-xs">{label}</p>
  </div>
);

const AttendanceTab = ({
  event,
  attendance,
  changeAttendance,
  readOnly = false,
}: {
  event: EventsUserView;
  attendance: FullAttendance[];
  changeAttendance: ({ user, event, newState }: { user: User; event: EventsUserView; newState: EventAttendance }) => void;
  readOnly?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const dialogs = useDialogs();
  const { user } = useGrants();
  const sinceFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  const byLastUpdate = (a: FullAttendance, b: FullAttendance) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1);
  const attending = useMemo(
    () => attendance.filter((x) => x.state === 'Attending' || x.state === 'AttendingAsTrainer' || x.state === 'AttendingAsTrial').sort(byLastUpdate),
    [attendance]
  );
  const declined = useMemo(() => attendance.filter((x) => x.state === 'Declined'), [attendance]);
  const requested = useMemo(() => attendance.filter((x) => x.state === 'RequestedAttendance').sort(byLastUpdate), [attendance]);
  const waiting = useMemo(() => attendance.filter((x) => x.state === 'Waiting' || x.state === 'WaitingAsTrial').sort(byLastUpdate), [attendance]);
  const taken = attendance.filter((x) => x.state === 'Attending').length;

  const name = (x: FullAttendance) => (x.user.id === user?.id ? t('events.attendanceTab.you', { name: x.user.name }) : x.user.name ?? '');
  const open = (x: FullAttendance) => () => dialogs.userProfile(x.user.id);

  const manage = (x: FullAttendance, withDecline: boolean) =>
    !readOnly && (
      <Has perm={'event.manage.attendees'}>
        {withDecline && (
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t('events.attendanceTab.decline', { name: x.user.name })}
            onClick={() => changeAttendance({ user: x.user, event, newState: 'Declined' })}
          >
            <X />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-lg"
          className="border-success text-success"
          aria-label={t('events.attendanceTab.accept', { name: x.user.name })}
          onClick={() => changeAttendance({ user: x.user, event, newState: 'Attending' })}
        >
          <Check />
        </Button>
      </Has>
    );

  return (
    <TabsContent value="attendance" className="m-0">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <StatTile value={attending.length} label={t('events.attendanceTab.statIn')} className="bg-success/10 text-success" />
            <StatTile value={waiting.length + requested.length} label={t('events.attendanceTab.statWaiting')} className="bg-info/10 text-info" />
            <StatTile value={declined.length} label={t('events.attendanceTab.statOut')} className="bg-muted text-muted-foreground" />
          </div>

          <section className="flex flex-col gap-1 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <ListSectionHeader className="px-0 pt-0" title={t('events.attendanceTab.attending')} count={attending.length} />
              {!!event.maxAttendees && event.maxAttendees > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t('events.information.spotsTaken', { count: taken, max: event.maxAttendees })}
                </span>
              )}
            </div>
            {attending.length > 0 ? (
              attending.map((x) => (
                <AttendeeRow
                  key={x.user.id}
                  attendance={x}
                  name={name(x)}
                  onOpen={open(x)}
                  action={
                    (x.state === 'AttendingAsTrainer' && <Badge variant="info">{t('events.attendanceTab.trainer')}</Badge>) ||
                    (x.state === 'AttendingAsTrial' && <Badge variant="warning">{t('events.attendanceTab.trial')}</Badge>)
                  }
                />
              ))
            ) : (
              <p className="py-2 text-sm text-muted-foreground">{t('events.attendanceTab.noAttendances')}</p>
            )}
          </section>

          {waiting.length > 0 && (
            <section className="flex flex-col gap-1 border-t pt-3">
              <ListSectionHeader className="px-0 pt-0" title={t('events.attendanceTab.waiting')} count={waiting.length} />
              {waiting.map((x, i) => (
                <AttendeeRow
                  key={x.user.id}
                  attendance={x}
                  name={name(x)}
                  muted
                  subtitle={[
                    t('events.attendanceTab.waitingPlace', { place: i + 1, since: sinceFormat.format(new Date(x.lastUpdate)) }),
                    x.state === 'WaitingAsTrial' && t('events.attendanceTab.trial'),
                  ].filter(Boolean).join(' · ')}
                  onOpen={open(x)}
                  action={manage(x, false)}
                />
              ))}
            </section>
          )}

          {requested.length > 0 && (
            <section className="flex flex-col gap-1 border-t pt-3">
              <ListSectionHeader className="px-0 pt-0" title={t('events.attendanceTab.requested')} count={requested.length} />
              {requested.map((x) => (
                <AttendeeRow
                  key={x.user.id}
                  attendance={x}
                  name={name(x)}
                  muted
                  subtitle={t('events.attendanceTab.requestedHint')}
                  onOpen={open(x)}
                  action={manage(x, true)}
                />
              ))}
            </section>
          )}

          {declined.length > 0 && (
            <Collapsible className="border-t pt-1">
              <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between text-left">
                <ListSectionHeader className="px-0 pt-0" title={t('events.attendanceTab.declined')} count={declined.length} />
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-1">
                {declined.map((x) => (
                  <AttendeeRow key={x.user.id} attendance={x}
                  name={name(x)} muted onOpen={open(x)} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default AttendanceTab;
