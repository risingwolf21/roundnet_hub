import { ListError, ListSkeleton, SegmentedControl } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useExpandRecurrences, useSeriesOverview } from '@/tanstack/events';
import { addWeeks, getISOWeek } from 'date-fns';
import { Ban, CalendarClock, CalendarSync, Check, ChevronRight, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { ToggleRow } from './dialogs/EventFormParts';
import { GRID_WEEKS, gridWeeks, rhythmOf, SeriesCell, weekCells } from './seriesGrid';

type SeriesRow = {
  id: string;
  title: string;
  rhythm: string;
  when: string;
  until: string;
  group: { id: string; name: string; color: string } | null;
  cells: SeriesCell[];
  sortKey: number;
  nextEventId: string | null;
};

const Cell = ({ cell, color, current }: { cell: SeriesCell; color: string; current: boolean }) => (
  <div className={cn('flex h-7 items-center justify-center', current && 'bg-primary/10')}>
    {cell === 'on' && <span className="size-3.5 rounded-full" style={{ backgroundColor: color }} />}
    {cell === 'off' && <span className="size-1.5 rounded-full bg-border" />}
    {cell === 'moved' && <span className="size-3.5 rounded-full border-2" style={{ borderColor: color }} />}
    {cell === 'cancelled' && <Ban className="size-4 text-destructive/70" />}
  </div>
);

const RecurringEvents = () => {
  const { t, i18n } = useTranslation();
  const { user } = useGrants();
  const navigate = useNavigate();
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => new Date());
  const weeks = useMemo(() => gridWeeks(now), [now]);
  const { data: series = [], isLoading, error, refetch } = useSeriesOverview(weeks[0], addWeeks(weeks[0], GRID_WEEKS));
  const createNextEvents = useExpandRecurrences();
  const [groupFilter, setGroupFilter] = useState('all');
  // Compare mode: show only the picked series. Nothing picked yet = all series.
  const [comparing, setComparing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo<SeriesRow[]>(() => {
    const lang = i18n.resolvedLanguage;
    const weekday = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    const time = new Intl.DateTimeFormat(lang, { timeStyle: 'short' });
    const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'numeric', year: 'numeric' });
    return series
      .map((s) => {
        const start = new Date(s.dtstart);
        // Times come from a regular occurrence: a separately edited one may have moved.
        const regular = s.occurrences.find((o) => !o.detached) ?? s.occurrences[0];
        const from = regular ? new Date(regular.startingDateTime) : start;
        const to = regular ? new Date(regular.endDateTime) : null;
        const next = s.occurrences.find((o) => !o.isCancelled && new Date(o.endDateTime) >= now);
        const rhythm = rhythmOf(s.rrule);
        return {
          id: s.id,
          title: s.title,
          rhythm:
            rhythm.key === 'monthly' && rhythm.day
              ? t('events.recurring.monthlyOnDay', { day: rhythm.day })
              : t(`events.recurring.${rhythm.key}`, 'count' in rhythm ? { count: rhythm.count } : {}),
          when: `${weekday.format(from)} ${time.format(from)}${to ? `–${time.format(to)}` : ''}`,
          until: s.until ? t('events.recurring.until', { date: date.format(new Date(s.until)) }) : t('events.recurring.noEnd'),
          group: s.fullGroup,
          cells: weekCells(s.occurrences, weeks),
          // Monday first, then by time of day.
          sortKey: ((from.getDay() + 6) % 7) * 1440 + from.getHours() * 60 + from.getMinutes(),
          nextEventId: next?.id ?? null,
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title));
  }, [series, weeks, now, t, i18n.resolvedLanguage]);

  const groups = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const row of rows) {
      if (!row.group) continue;
      const entry = byId.get(row.group.id) ?? { id: row.group.id, name: row.group.name, count: 0 };
      entry.count += 1;
      byId.set(row.group.id, entry);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const inGroup = rows.filter((row) => groupFilter === 'all' || row.group?.id === groupFilter);
  const shown = comparing && picked.length > 0 ? inGroup.filter((row) => picked.includes(row.id)) : inGroup;
  const togglePick = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const createNext = () =>
    createNextEvents.mutate(undefined, {
      onSuccess: (data) => toast.success(t('events.recurring.seriesUpdatedToast', { processed: data.processed })),
      onError: () => toast.error(t('events.recurring.createError')),
    });

  return (
    <div>
      <AppBar className="!border-b !shadow-sm" title={t('events.recurring.title')} primaryAction="back" user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={async () => { await refetch(); }}>
          <div className="@container mx-auto flex w-full max-w-5xl flex-col gap-3 p-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            <section className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t('events.recurring.summary', { count: rows.length, weeks: GRID_WEEKS })}</div>
                <div className="text-xs text-muted-foreground">{t('events.recurring.description')}</div>
              </div>
              <Button variant="outline" disabled={createNextEvents.isPending} onClick={createNext}>
                {createNextEvents.isPending ? <Spinner /> : <RefreshCw />}
                {t('events.recurring.create')}
              </Button>
            </section>

            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : error ? (
              <ListError
                title={t('events.recurring.loadError')}
                description={error instanceof Error ? error.message : undefined}
                retryLabel={t('events.recurring.retry')}
                onRetry={() => refetch()}
              />
            ) : rows.length === 0 ? (
              <Empty className="mt-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CalendarSync /></EmptyMedia>
                  <EmptyTitle>{t('events.recurring.empty')}</EmptyTitle>
                  <EmptyDescription>{t('events.recurring.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                {groups.length > 1 && (
                  <SegmentedControl
                    ariaLabel={t('events.recurring.groupFilter')}
                    value={groupFilter}
                    onChange={setGroupFilter}
                    options={[
                      { value: 'all', label: t('events.recurring.allGroups'), count: rows.length },
                      ...groups.map((g) => ({ value: g.id, label: g.name, count: g.count })),
                    ]}
                  />
                )}

                <section className="rounded-xl border bg-card p-3">
                  <ToggleRow
                    id="recurring-compare"
                    title={t('events.recurring.compare')}
                    description={t('events.recurring.compareHint')}
                    checked={comparing}
                    onCheckedChange={(on) => {
                      setComparing(on);
                      if (!on) setPicked([]);
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {inGroup.map((row) => {
                          const active = picked.includes(row.id);
                          return (
                            <button
                              key={row.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => togglePick(row.id)}
                              className={cn(
                                'flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm',
                                active ? 'border-primary bg-primary/10 font-medium' : 'bg-background text-muted-foreground'
                              )}
                            >
                              {active ? (
                                <Check className="size-3.5 shrink-0 text-primary" />
                              ) : (
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.group?.color ?? 'var(--primary)' }} />
                              )}
                              <span className="truncate">{row.title}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{t('events.recurring.compareCount', { count: shown.length, total: inGroup.length })}</span>
                        {picked.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setPicked([])}>
                            {t('events.recurring.compareReset')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </ToggleRow>
                </section>

                <section aria-label={t('events.recurring.gridLabel', { weeks: GRID_WEEKS })} className="overflow-hidden rounded-xl border bg-card">
                  <div className="sticky top-0 z-10 border-b border-l-4 border-l-transparent bg-card/95 px-3 pt-1 backdrop-blur @3xl:pl-[calc(20rem+1.75rem)]">
                    <div className="grid grid-cols-8 text-center text-[10px] font-medium text-muted-foreground tabular-nums">
                      {weeks.map((week, i) => (
                        <div key={week.toISOString()} className={cn('py-1', i === 0 && 'rounded-t-md bg-primary/10 font-semibold text-primary')}>
                          {i === 0 ? t('events.recurring.thisWeek') : t('events.recurring.week', { week: getISOWeek(week) })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y">
                    {shown.map((row) => {
                      const color = row.group?.color ?? 'var(--primary)';
                      return (
                        <button
                          key={row.id}
                          type="button"
                          disabled={!row.nextEventId}
                          onClick={() => row.nextEventId && navigate(`/training/event/${row.nextEventId}`)}
                          className="flex w-full flex-col gap-2 border-l-4 px-3 py-3 text-left hover:bg-muted/40 disabled:hover:bg-transparent @3xl:flex-row @3xl:items-center @3xl:gap-4"
                          style={{ borderLeftColor: color }}
                        >
                          <div className="flex min-w-0 items-start gap-2 @3xl:w-80 @3xl:shrink-0">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{row.title}</div>
                              <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{row.rhythm}</span>
                                <span aria-hidden>·</span>
                                <span>{row.when}</span>
                              </div>
                              <div className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-xs text-muted-foreground">
                                {row.group && (
                                  <>
                                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="truncate">{row.group.name}</span>
                                    <span aria-hidden>·</span>
                                  </>
                                )}
                                <span className="shrink-0">{row.until}</span>
                              </div>
                            </div>
                            {row.nextEventId && <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                          </div>
                          <div className="grid w-full flex-1 grid-cols-8" aria-hidden>
                            {row.cells.map((cell, i) => (
                              <Cell key={weeks[i].toISOString()} cell={cell} color={color} current={i === 0} />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-primary" />{t('events.recurring.legendOccurrence')}</span>
                  <span className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-primary" />{t('events.recurring.legendMoved')}</span>
                  <span className="flex items-center gap-1.5"><Ban className="size-3.5 text-destructive/70" />{t('events.recurring.legendCancelled')}</span>
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-border" />{t('events.recurring.legendNone')}</span>
                </div>
              </>
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default RecurringEvents;
