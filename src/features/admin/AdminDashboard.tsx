import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Has } from '@/hooks/useGrants';
import { Permission } from '@/generated/supabase-types';
import { useAdminAnalytics } from '@/tanstack/admin';
import { useEvents } from '@/tanstack/events';
import { format, startOfMonth, subDays } from 'date-fns';
import {
  AlertCircle, CalendarClock, ChartArea, ChevronRight, CircleCheck, Euro, GitMerge,
  History, KeyRound, Send, Users, Volleyball
} from 'lucide-react';
import { ElementType, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import { useAdminAttention } from './useAdminAttention';

const AttentionRow = ({
  icon: Icon,
  title,
  description,
  count,
  onClick,
}: {
  icon: ElementType;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
  >
    <Icon className="size-5 shrink-0 text-warning" />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
    <Badge variant="error" className="min-w-5 px-1.5">{count}</Badge>
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </button>
);

const ToolRow = ({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: ElementType;
  title: string;
  description: string;
  badge?: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
  >
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
      <Icon className="size-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="truncate text-xs text-muted-foreground">{description}</div>
    </div>
    {!!badge && <Badge variant="error" className="min-w-5 px-1.5">{badge}</Badge>}
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </button>
);

type TrendPoint = { attending_count: number | null; startingDateTime: string };

const AttendanceSparkline = ({ events }: { events: TrendPoint[] }) => {
  if (events.length < 2) return null;

  const counts = events.map(e => e.attending_count ?? 0);
  const actualMin = Math.min(...counts);
  const actualMax = Math.max(...counts);
  const min = actualMin - 2;
  const max = actualMax + 2;
  const range = max - min || 1;
  const W = 240, H = 48;

  const toX = (i: number) => (i / (counts.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * H;

  const linePoints = counts.map((c, i) => `${toX(i)},${toY(c)}`).join(' ');
  const areaPoints = `0,${H} ${linePoints} ${W},${H}`;

  const isUp = counts[counts.length - 1] >= counts[0];
  const color = isUp ? '#22c55e' : '#ef4444';

  const firstDate = format(new Date(events[0].startingDateTime), 'dd.MM.');
  const lastDate = format(new Date(events[events.length - 1].startingDateTime), 'dd.MM.');

  const minY = toY(actualMin);
  const maxY = toY(actualMax);
  const showBands = actualMin !== actualMax;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
          <defs>
            <linearGradient id="att-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {showBands && (
            <>
              <line x1="0" y1={maxY} x2={W} y2={maxY} stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1={minY} x2={W} y2={minY} stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            </>
          )}
          <polygon points={areaPoints} fill="url(#att-spark-fill)" />
          <polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {showBands && (
          <>
            <span className="absolute right-0 text-[9px] leading-none text-muted-foreground" style={{ top: `${(maxY / H) * 100}%`, transform: 'translateY(-100%)' }}>{actualMax}</span>
            <span className="absolute right-0 text-[9px] leading-none text-muted-foreground" style={{ top: `${(minY / H) * 100}%`, transform: 'translateY(-100%)' }}>{actualMin}</span>
          </>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
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

  const attention = useAdminAttention();
  const payments = attention.paymentList;
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

  const cutoff = subDays(new Date(), 30);
  const trendEvents = pastEvents
    .filter(e => !e.isCancelled && new Date(e.startingDateTime) >= cutoff)
    .toSorted((a, b) => a.startingDateTime.localeCompare(b.startingDateTime));

  const toolGroups = [
    {
      key: 'community',
      title: t('admin.dashboard.groups.community'),
      items: [
        { title: t('browse.manageUsers'), description: t('admin.dashboard.tools.users'), icon: Users, path: '/admin/users', perm: 'users.manage' },
        { title: t('browse.merge_accounts'), description: t('admin.dashboard.tools.mergeAccounts'), icon: GitMerge, path: '/admin/merge_accounts', perm: 'games.admin.merge_accounts' },
        { title: t('browse.notifyUsers'), description: t('admin.dashboard.tools.notify'), icon: Send, path: '/admin/notify_users', perm: 'admin.notify_users' },
      ],
    },
    {
      key: 'drinks',
      title: t('admin.dashboard.groups.drinks'),
      items: [
        { title: t('browse.managePayments'), description: t('admin.dashboard.tools.payments'), icon: Euro, path: '/admin/drinks/payments', perm: 'drinks.confirm.payments', badge: attention.payments },
        { title: t('browse.completeHistory'), description: t('admin.dashboard.tools.history'), icon: History, path: '/admin/drinks/history', perm: 'drinks.history.admin' },
      ],
    },
    {
      key: 'access',
      title: t('admin.dashboard.groups.access'),
      items: [
        { title: t('browse.permissions'), description: t('admin.dashboard.tools.permissions'), icon: KeyRound, path: '/admin/grants', perm: 'grants.manage' },
        { title: t('browse.analytics'), description: t('admin.dashboard.tools.analytics'), icon: ChartArea, path: '/admin/analytics', perm: 'admin.analytics.view' },
      ],
    },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => hasPerm(item.perm as Permission)) }))
    .filter((group) => group.items.length > 0);

  const attentionVisible = hasPerm('drinks.confirm.payments') || hasPerm('groups.manage.admin');

  return (
    <div>
      <AppBar title={t('admin.dashboard.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <div className="p-4 flex flex-col gap-4">

          {attentionVisible && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
                {t('admin.dashboard.needsAttention')}
              </h3>
              <Card className="gap-0 divide-y overflow-hidden py-0">
                {attention.isLoading ? (
                  <div className="p-4"><Skeleton className="h-10 w-full" /></div>
                ) : attention.total === 0 && attention.joinRequests === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <CircleCheck className="size-5 shrink-0 text-success" />
                    <div>
                      <div className="text-sm font-medium">{t('admin.dashboard.allCaughtUp')}</div>
                      <div className="text-xs text-muted-foreground">{t('admin.dashboard.allCaughtUpDesc')}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {attention.payments > 0 && (
                      <AttentionRow
                        icon={Euro}
                        title={t('admin.dashboard.pendingPayments')}
                        description={t('admin.dashboard.total', { amount: totalAmount.toFixed(2) })}
                        count={attention.payments}
                        onClick={() => navigate('/admin/drinks/payments')}
                      />
                    )}
                    {attention.joinRequests > 0 && (
                      <AttentionRow
                        icon={Users}
                        title={t('admin.dashboard.joinRequests')}
                        description={t('admin.dashboard.joinRequestsDesc')}
                        count={attention.joinRequests}
                        onClick={() => navigate('/groups')}
                      />
                    )}
                  </>
                )}
              </Card>
            </section>
          )}

          {(hasPerm('event.manage.attendees') || canViewAnalytics) && (
            <h3 className="-mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
              {t('admin.dashboard.insights')}
            </h3>
          )}

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

          {toolGroups.map(({ key, title, items }) => (
            <section key={key}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
                {title}
              </h3>
              <Card className="gap-0 divide-y overflow-hidden py-0">
                {items.map(({ title: itemTitle, description, icon, path, badge }) => (
                  <ToolRow
                    key={path}
                    icon={icon}
                    title={itemTitle}
                    description={description}
                    badge={badge}
                    onClick={() => navigate(path)}
                  />
                ))}
              </Card>
            </section>
          ))}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
