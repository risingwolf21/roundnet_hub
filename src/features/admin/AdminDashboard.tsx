import { format, startOfMonth, subDays } from 'date-fns';
import {
  AlertCircle, CalendarClock, ChartArea, Euro, GitMerge,
  History, KeyRound, Send, Users, Volleyball
} from 'lucide-react';
import { ElementType, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Has } from '@/hooks/useGrants';
import { useAdminAnalytics, useAllPayments } from '@/tanstack/admin';
import { useEvents } from '@/tanstack/events';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useGrants } from '../auth/GrantsContext';

const StatCard = ({
  title,
  icon: Icon,
  highlight,
  isLoading,
  isError,
  onClick,
  children,
}: {
  title: string;
  icon: ElementType;
  highlight?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) => (
  <Card
    className={`cursor-pointer transition-all hover:ring-primary/30 active:scale-[0.98] ${highlight ? 'ring-warning/70' : ''}`}
    onClick={onClick}
  >
    <CardHeader>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${highlight ? 'text-warning' : 'text-muted-foreground'}`} />
        <CardTitle className="text-sm">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      {isLoading ? (
        <Skeleton className="h-9 w-16 mb-1" />
      ) : isError ? (
        <div className="flex items-center gap-1 text-destructive/80 text-sm">
          <AlertCircle className="size-3.5" />
          <span>–</span>
        </div>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);

type TrendPoint = { attending_count: number | null; startingDateTime: string };

const AttendanceSparkline = ({ events }: { events: TrendPoint[] }) => {
  if (events.length < 2) return null;

  const counts = events.map(e => e.attending_count ?? 0);
  const min = Math.min(...counts) - 2;
  const max = Math.max(...counts) + 2;
  const range = max - min || 1;
  const W = 240, H = 48;

  const toX = (i: number) => (i / (counts.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * H;

  const linePoints = counts.map((c, i) => `${toX(i)},${toY(c)}`).join(' ');
  const areaPoints = `0,${H} ${linePoints} ${W},${H}`;

  const isUp = counts[counts.length - 1] >= counts[0];
  const color = isUp ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="att-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#att-spark-fill)" />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasPerm } = useGrants();

  const canViewAnalytics = hasPerm('admin.analytics.view');

  const { p_start: monthStart, p_end: today } = useMemo(() => ({
    p_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    p_end: format(new Date(), 'yyyy-MM-dd'),
  }), []);

  const { data: payments = [], isLoading: paymentsLoading, isError: paymentsError } = useAllPayments();
  const { data: joinRequests = [], isLoading: requestsLoading, isError: requestsError } = useRequestedUsersPerGroup(user);
  const { data: pastEvents = [], isLoading: eventsLoading, isError: eventsError } = useEvents('past');
  const { data: monthlyUsers = [], isLoading: monthlyLoading, isError: monthlyError } = useAdminAnalytics(
    'admin_analytics_attendance_ranking',
    { p_start: monthStart, p_end: today },
    canViewAnalytics,
  );

  const totalAmount = useMemo(
    () => payments.reduce(
      (sum, p) => sum + p.history.reduce((s, h) => s + ((h as unknown as { amount?: number | null }).amount ?? 0), 0),
      0
    ),
    [payments]
  );

  const lastTraining = pastEvents.find(e => !e.isCancelled) ?? null;

  const trendEvents = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return pastEvents
      .filter(e => !e.isCancelled && new Date(e.startingDateTime) >= cutoff)
      .sort((a, b) => a.startingDateTime.localeCompare(b.startingDateTime));
  }, [pastEvents]);

  const quickLinks = [
    { title: t('browse.managePayments'), icon: Euro,      path: '/admin/drinks/payments', perm: 'drinks.confirm.payments' as const },
    { title: t('browse.manageUsers'),    icon: Users,     path: '/admin/users',            perm: 'users.manage' as const },
    { title: t('browse.analytics'),      icon: ChartArea, path: '/admin/analytics',        perm: 'admin.analytics.view' as const },
    { title: 'Grants',                   icon: KeyRound,  path: '/admin/grants',           perm: 'grants.manage' as const },
    { title: t('browse.completeHistory'),icon: History,   path: '/admin/drinks/history',   perm: 'drinks.history.admin' as const },
    { title: t('browse.merge_accounts'), icon: GitMerge,  path: '/admin/merge_accounts',   perm: 'games.admin.merge_accounts' as const },
    { title: t('browse.notifyUsers'),    icon: Send,      path: '/admin/notify_users',     perm: 'admin.notify_users' as const },
  ] as const;

  return (
    <div>
      <AppBar title={t('admin.dashboard.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <div className="p-4 flex flex-col gap-4">

          <div className="grid grid-cols-2 gap-3">
            <Has perm="drinks.confirm.payments">
              <StatCard
                title={t('admin.dashboard.pendingPayments')}
                icon={Euro}
                highlight={!paymentsLoading && !paymentsError && payments.length > 0}
                isLoading={paymentsLoading}
                isError={paymentsError}
                onClick={() => navigate('/admin/drinks/payments')}
              >
                <div className="text-3xl font-bold">{payments.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {payments.length > 0
                    ? t('admin.dashboard.total', { amount: totalAmount.toFixed(2) })
                    : t('admin.dashboard.pendingPaymentsDesc')}
                </div>
              </StatCard>
            </Has>

            <Has perm="users.manage">
              <StatCard
                title={t('admin.dashboard.joinRequests')}
                icon={Users}
                highlight={!requestsLoading && !requestsError && joinRequests.length > 0}
                isLoading={requestsLoading}
                isError={requestsError}
                onClick={() => navigate('/admin/users')}
              >
                <div className="text-3xl font-bold">{joinRequests.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('admin.dashboard.joinRequestsDesc')}
                </div>
              </StatCard>
            </Has>
          </div>

          <Has perm="event.manage.attendees">
            <Card
              className="cursor-pointer transition-all hover:ring-primary/30 active:scale-[0.98]"
              onClick={() => lastTraining && navigate(`/training/event/${lastTraining.id}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Volleyball className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{t('admin.dashboard.lastTraining')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {eventsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : eventsError ? (
                  <div className="flex items-center gap-1 text-destructive/80 text-sm">
                    <AlertCircle className="size-3.5" />–
                  </div>
                ) : !lastTraining ? (
                  <span className="text-muted-foreground text-sm">{t('admin.dashboard.noEvent')}</span>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-3xl font-bold">
                        {lastTraining.attending_count ?? 0}
                        {lastTraining.maxAttendees != null && (
                          <span className="text-base font-normal text-muted-foreground">
                            {' / '}{lastTraining.maxAttendees}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('admin.dashboard.lastTrainingDesc')}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div className="font-medium text-foreground text-sm">{lastTraining.title}</div>
                      <div>{format(new Date(lastTraining.startingDateTime), 'dd.MM.yy')}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Volleyball className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{t('admin.dashboard.attendanceTrend')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {eventsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : eventsError ? (
                  <div className="flex items-center gap-1 text-destructive/80 text-sm">
                    <AlertCircle className="size-3.5" />–
                  </div>
                ) : trendEvents.length < 2 ? (
                  <span className="text-muted-foreground text-sm">{t('admin.dashboard.noTrendData')}</span>
                ) : (
                  <AttendanceSparkline events={trendEvents} />
                )}
              </CardContent>
            </Card>
          </Has>

          <Has perm="admin.analytics.view">
            <Card
              className="cursor-pointer transition-all hover:ring-primary/30 active:scale-[0.98]"
              onClick={() => navigate('/admin/analytics')}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{t('admin.dashboard.monthlyActivity')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {monthlyLoading ? (
                  <Skeleton className="h-9 w-16 mb-1" />
                ) : monthlyError ? (
                  <div className="flex items-center gap-1 text-destructive/80 text-sm">
                    <AlertCircle className="size-3.5" />–
                  </div>
                ) : (
                  <div className="text-3xl font-bold">{monthlyUsers.length}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {t('admin.dashboard.monthlyActivityDesc')}
                </div>
              </CardContent>
            </Card>
          </Has>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
              {t('admin.dashboard.quickLinks')}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {quickLinks.map(({ title, icon: Icon, path, perm }) => (
                <Has key={path} perm={perm}>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-1.5 py-3 px-2"
                    onClick={() => navigate(path)}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="text-xs text-center leading-tight break-words w-full">{title}</span>
                  </Button>
                </Has>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
