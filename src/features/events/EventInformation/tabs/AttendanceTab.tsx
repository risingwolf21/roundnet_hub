import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { EventsUserView, FullAttendance } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { isBefore } from 'date-fns';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const AttendeeRow = ({
  attendance,
  subtitle,
  muted,
  action,
  onOpen,
}: {
  attendance: FullAttendance;
  subtitle?: string | false;
  muted?: boolean;
  action?: React.ReactNode;
  onOpen: () => void;
}) => (
  <div className="flex items-center gap-3">
    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onOpen}>
      <Avatar className={cn(muted && 'opacity-70')}>
        <AvatarImage src={attendance.user.avatarUrl || ''} />
        <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? 'User')}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', muted && 'text-muted-foreground')}>{attendance.user.name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </button>
    {action}
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
  const { t } = useTranslation();
  const dialogs = useDialogs();

  const attending = useMemo(
    () => attendance.filter((x) => x.state === 'Attending' || x.state === 'AttendingAsTrainer' || x.state === 'AttendingAsTrial').sort((a, b) => isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1),
    [attendance]
  );
  const declined = useMemo(() => attendance.filter((x) => x.state === 'Declined'), [attendance]);
  const requested = useMemo(() => attendance.filter((x) => x.state === 'RequestedAttendance'), [attendance]);
  const waiting = useMemo(
    () => attendance.filter((x) => x.state === 'Waiting' || x.state === 'WaitingAsTrial').sort((a, b) => isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1),
    [attendance]
  );

  const acceptButton = (x: FullAttendance) => !readOnly && (
    <Has perm={'event.manage.attendees'}>
      <Button
        variant="outline"
        size="icon"
        aria-label={t('events.attendanceTab.accept', { name: x.user.name })}
        onClick={() => changeAttendance({ user: x.user, event, newState: 'Attending' })}
      >
        <Check className="size-4" />
      </Button>
    </Has>
  );

  const sections = [
    { key: 'requested', title: t('events.attendanceTab.requested', { n: requested.length }), rows: requested, pending: true },
    { key: 'waiting', title: t('events.attendanceTab.waiting', { n: waiting.length }), rows: waiting, pending: true },
    { key: 'declined', title: t('events.attendanceTab.declined', { n: declined.length }), rows: declined, pending: false },
  ].filter((s) => s.rows.length > 0);

  return (
    <TabsContent value="attendance" className="m-0">
      <Card className="pt-0 gap-0">
        <CardHeader className="border-b !py-2">
          <div className="flex items-center justify-between !p-0">
            <CardTitle className="text-lg">{t('events.attendanceTab.title')}</CardTitle>
            {!!event.maxAttendees && event.maxAttendees > 0 && (
              <Badge variant="outline">
                {t('events.information.capacity', { count: attendance.filter((x) => x.state === 'Attending').length, max: event.maxAttendees })}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-4">
          <section className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('events.attendanceTab.attending', { n: attending.length })}
            </h4>
            {attending.length > 0 ? (
              attending.map((x) => (
                <AttendeeRow
                  key={x.user.id}
                  attendance={x}
                  subtitle={
                    (x.state === 'AttendingAsTrainer' && t('events.attendanceTab.trainer')) ||
                    (x.state === 'AttendingAsTrial' && t('events.attendanceTab.trial'))
                  }
                  onOpen={() => dialogs.userProfile(x.user.id)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('events.attendanceTab.noAttendances')}</p>
            )}
          </section>

          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-3 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h4>
              {section.rows.map((x) => (
                <AttendeeRow
                  key={x.user.id}
                  attendance={x}
                  muted
                  subtitle={x.state === 'WaitingAsTrial' && t('events.attendanceTab.trial')}
                  onOpen={() => dialogs.userProfile(x.user.id)}
                  action={
                    section.pending && (
                      <>
                        <Badge variant="secondary">{t('events.attendanceTab.pending')}</Badge>
                        {acceptButton(x)}
                      </>
                    )
                  }
                />
              ))}
            </section>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default AttendanceTab;
