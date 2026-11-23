import { ListError, ListSkeleton } from '@/components/list/ListParts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import type { RefreshLeagueResult } from '@/features/bundesliga/repository';
import {
  invalidateBundesliga,
  useBundesligaSeason,
  useDiscoverBundesligaLeagues,
  useRefreshBundesligaGames,
  useRefreshBundesligaLeague,
  useSetBundesligaSeason,
} from '@/features/bundesliga/useBundesliga';
import { captureException } from '@sentry/react';
import { CalendarRange, CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

// Roughly what one league takes with rosters and, the first time, all its games (~100 playerzone requests).
const SECONDS_PER_LEAGUE = 60;
const TOURNAMENT_LINK = /(^|\/tournaments\/)\d+-[a-z0-9-]+/i;

type LeagueOutcome = { id: number; name: string } & (
  | { ok: true; result: RefreshLeagueResult; games: number }
  | { ok: false; error: string }
);

type Run = { running: boolean; total: number; current: string | null; done: LeagueOutcome[]; stopped: boolean };

/** Admin tool: set the Bundesliga season and reload its leagues from playerzone. */
const BundesligaAdminScreen = () => {
  const { t, i18n } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const season = useBundesligaSeason();
  const setSeason = useSetBundesligaSeason();
  const discover = useDiscoverBundesligaLeagues();
  const refreshLeague = useRefreshBundesligaLeague();
  const refreshGames = useRefreshBundesligaGames();

  const [link, setLink] = useState('');
  const [linkTouched, setLinkTouched] = useState(false);
  const linkInvalid = linkTouched && !TOURNAMENT_LINK.test(link.trim());
  const [run, setRun] = useState<Run | null>(null);
  const stopRequested = useRef(false);

  const leagues = season.data?.leagues ?? [];
  const minutes = Math.max(1, Math.ceil(((leagues.length || 4) * SECONDS_PER_LEAGUE) / 60));
  const dateTime = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' });

  const saveSeason = () => {
    setLinkTouched(true);
    if (!TOURNAMENT_LINK.test(link.trim())) return;
    setSeason.mutate(link.trim(), {
      onSuccess: (r) => {
        toast.success(t('admin.bundesliga.seasonSaved', { name: r.season.name ?? '', count: r.leagues.length }));
        setLink('');
        setLinkTouched(false);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const reloadAll = async () => {
    const ok = await dialogs.confirm(t('admin.bundesliga.confirm', { minutes }), {
      okText: t('admin.bundesliga.start'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    stopRequested.current = false;
    let current: Run = { running: true, total: leagues.length, current: null, done: [], stopped: false };
    setRun(current);
    try {
      // Finds the season's leagues the first time.
      const { leagues: todo } = await discover.mutateAsync();
      current = { ...current, total: todo.length };
      for (const league of todo) {
        if (stopRequested.current) break;
        current = { ...current, current: league.name };
        setRun(current);
        let outcome: LeagueOutcome;
        try {
          const result = await refreshLeague.mutateAsync(league.id);
          // The games come in calls of ~100 s each; repeat until none are pending.
          let games = 0;
          for (let pending = Infinity; pending > 0 && !stopRequested.current; ) {
            const step = await refreshGames.mutateAsync(league.id);
            games += step.fetched;
            pending = step.pending;
            if (pending > 0) setRun((current = { ...current, current: t('admin.bundesliga.gamesPending', { name: league.name, count: pending }) }));
            if (step.fetched === 0) break; // nothing moved: don't loop forever
          }
          outcome = { ...league, ok: true, result, games };
        } catch (error) {
          captureException(error, { tags: { type: 'BundesligaRefresh', scope: 'bundesliga' } });
          outcome = { ...league, ok: false, error: (error as Error).message };
        }
        current = { ...current, done: [...current.done, outcome] };
        setRun(current);
      }
      current = { ...current, running: false, current: null, stopped: stopRequested.current };
      setRun(current);
      const failed = current.done.filter((d) => !d.ok).length;
      if (failed > 0) toast.error(t('admin.bundesliga.doneWithErrors', { count: failed }));
      else toast.success(t('admin.bundesliga.done', { count: current.done.length }));
    } catch (error) {
      captureException(error, { tags: { type: 'BundesligaRefresh', scope: 'bundesliga' } });
      setRun({ ...current, running: false, current: null });
      toast.error((error as Error).message);
    } finally {
      invalidateBundesliga();
    }
  };

  const percent = run && run.total > 0 ? Math.round((run.done.length / run.total) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppBar title={t('admin.bundesliga.title')} primaryAction="back" user={user} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 pb-safe-bottom">
        {season.isLoading ? (
          <ListSkeleton rows={2} />
        ) : season.isError ? (
          <ListError
            title={t('admin.bundesliga.loadErrorTitle')}
            description={t('admin.bundesliga.loadErrorDescription')}
            retryLabel={t('common.retry')}
            onRetry={() => season.refetch()}
          />
        ) : (
          <>
            {/* Season */}
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <header className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarRange className="size-4" />
                </span>
                {t('admin.bundesliga.season')}
              </header>
              {season.data ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{season.data.name ?? season.data.tournament_slug}</span>
                  <code className="truncate text-xs text-muted-foreground">{season.data.tournament_slug}</code>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('admin.bundesliga.noSeason')}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bl-season-link" className="text-sm font-medium">{t('admin.bundesliga.linkLabel')}</label>
                <Input
                  id="bl-season-link"
                  type="url"
                  inputMode="url"
                  placeholder="https://playerzone.roundnetgermany.de/tournaments/…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  aria-invalid={linkInvalid}
                  aria-describedby="bl-season-link-hint"
                />
                <p id="bl-season-link-hint" className={linkInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                  {linkInvalid ? t('admin.bundesliga.linkInvalid') : t('admin.bundesliga.linkHint')}
                </p>
              </div>
              <Button variant="outline" className="w-full" disabled={setSeason.isPending || run?.running} onClick={saveSeason}>
                {setSeason.isPending && <Spinner />}
                {t('admin.bundesliga.saveSeason')}
              </Button>
            </section>

            {/* Leagues */}
            {leagues.length > 0 && (
              <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <div className="text-sm font-semibold">{t('admin.bundesliga.leagues', { count: leagues.length })}</div>
                {leagues.map((l) => (
                  <Item key={l.id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{l.name}</ItemTitle>
                      <ItemDescription>
                        {l.refreshed_at
                          ? t('admin.bundesliga.refreshedAt', { date: dateTime.format(new Date(l.refreshed_at)) })
                          : t('admin.bundesliga.neverRefreshed')}
                      </ItemDescription>
                    </ItemContent>
                    {l.refresh_error && <Badge variant="error">{t('admin.bundesliga.lastFailed')}</Badge>}
                  </Item>
                ))}
              </section>
            )}

            {/* Reload */}
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <header className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <RefreshCw className="size-4" />
                </span>
                {t('admin.bundesliga.reloadAll')}
              </header>
              {run?.running ? (
                <>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={run.total}
                    aria-valuenow={run.done.length}
                    aria-label={t('admin.bundesliga.progressLabel')}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-sm tabular-nums">
                    {t('admin.bundesliga.progress', { done: run.done.length, total: run.total })}
                    {run.current ? ` · ${run.current}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('admin.bundesliga.keepOpen')}</p>
                  <Button variant="outline" className="w-full" onClick={() => (stopRequested.current = true)}>
                    {t('admin.bundesliga.stop')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{t('admin.bundesliga.reloadHint', { minutes })}</p>
                  <Button className="w-full" disabled={!season.data} onClick={reloadAll}>
                    <RefreshCw />
                    {t('admin.bundesliga.start')}
                  </Button>
                </>
              )}
            </section>

            {/* Result of the last run */}
            {run && !run.running && run.done.length > 0 && (
              <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                {run.stopped && (
                  <Alert variant="warning">
                    <TriangleAlert />
                    <AlertDescription>{t('admin.bundesliga.stopped', { done: run.done.length, total: run.total })}</AlertDescription>
                  </Alert>
                )}
                {run.done.map((d) => (
                  <Item key={d.id} variant="outline" size="sm">
                    {d.ok ? <CircleCheck className="size-4 shrink-0 text-success" /> : <TriangleAlert className="size-4 shrink-0 text-destructive" />}
                    <ItemContent>
                      <ItemTitle>{d.name}</ItemTitle>
                      <ItemDescription className="line-clamp-2">
                        {d.ok
                          ? t('admin.bundesliga.result', {
                              teams: d.result.teams,
                              players: d.result.players ?? 0,
                              played: d.result.played,
                              encounters: d.result.encounters,
                              games: d.games,
                            })
                          : d.error}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default BundesligaAdminScreen;
