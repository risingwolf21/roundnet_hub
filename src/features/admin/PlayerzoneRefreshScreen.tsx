import { ListError, ListSkeleton } from '@/components/list/ListParts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { PlayerzoneRefreshBatch } from '@/repository/PlayerDataRepository';
import { usePlayerzoneStats, useRefreshPlayerzoneBatch } from '@/tanstack/player_data';
import { captureException } from '@sentry/react';
import { CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

// Roughly one playerzone request plus the pause between requests per player (see fetch-player-info).
const SECONDS_PER_PLAYER = 0.6;

type Run = {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  unrated: number;
  failed: PlayerzoneRefreshBatch['failed'];
  stopped: boolean;
  error: boolean;
};

/** Admin tool: reload RG-Index, avatar and Pro status of every player with an RG ID, batch by batch. */
const PlayerzoneRefreshScreen = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const stats = usePlayerzoneStats();
  const refreshBatch = useRefreshPlayerzoneBatch();
  const [run, setRun] = useState<Run | null>(null);
  const stopRequested = useRef(false);

  const linked = stats.data?.linked ?? 0;
  const minutes = Math.max(1, Math.ceil((linked * SECONDS_PER_PLAYER) / 60));

  const start = async () => {
    const ok = await dialogs.confirm(t('admin.playerzone.confirm', { count: linked, minutes }), {
      okText: t('admin.playerzone.start'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    stopRequested.current = false;
    let current: Run = { running: true, total: linked, processed: 0, updated: 0, unrated: 0, failed: [], stopped: false, error: false };
    setRun(current);
    try {
      let offset: number | null = 0;
      while (offset !== null && !stopRequested.current) {
        const batch = await refreshBatch.mutateAsync(offset);
        current = {
          ...current,
          total: batch.total,
          processed: batch.processed,
          updated: current.updated + batch.updated,
          unrated: current.unrated + batch.unrated,
          failed: [...current.failed, ...batch.failed],
        };
        setRun(current);
        offset = batch.next;
      }
      current = { ...current, running: false, stopped: stopRequested.current };
      setRun(current);
      toast.success(t('admin.playerzone.done', { count: current.updated }));
    } catch (error) {
      captureException(error, { tags: { type: 'PlayerzoneRefresh', scope: 'games' } });
      setRun({ ...current, running: false, error: true });
      toast.error(t('admin.playerzone.error'));
    } finally {
      stats.refetch();
    }
  };

  const percent = run && run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppBar title={t('admin.playerzone.title')} primaryAction="back" user={user} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 pb-safe-bottom">
        {/* State of the whole */}
        {stats.isLoading ? (
          <ListSkeleton rows={1} />
        ) : stats.isError ? (
          <ListError
            title={t('admin.playerzone.statsErrorTitle')}
            description={t('admin.playerzone.statsErrorDescription')}
            retryLabel={t('common.retry')}
            onRetry={() => stats.refetch()}
          />
        ) : (
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold">{t('admin.playerzone.linked', { count: linked })}</span>
              {stats.data!.withoutIndex > 0 && (
                <Badge variant="warning">{t('admin.playerzone.withoutIndex', { count: stats.data!.withoutIndex })}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.playerzone.description')}</p>
          </section>
        )}

        {/* Action */}
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <header className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw className="size-4" />
            </span>
            {t('admin.playerzone.reloadAll')}
          </header>
          {run?.running ? (
            <>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={run.total}
                aria-valuenow={run.processed}
                aria-label={t('admin.playerzone.progressLabel')}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-sm tabular-nums">{t('admin.playerzone.progress', { processed: run.processed, total: run.total })}</p>
              <p className="text-xs text-muted-foreground">{t('admin.playerzone.keepOpen')}</p>
              <Button variant="outline" className="w-full" onClick={() => (stopRequested.current = true)}>
                {t('admin.playerzone.stop')}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t('admin.playerzone.reloadAllHint', { minutes })}</p>
              <Button className="w-full" disabled={!stats.isSuccess || linked === 0} onClick={start}>
                <RefreshCw />
                {t('admin.playerzone.start')}
              </Button>
            </>
          )}
        </section>

        {/* Result of the last run */}
        {run && !run.running && (
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <Alert variant={run.error || run.failed.length > 0 ? 'warning' : 'success'}>
              {run.error || run.failed.length > 0 ? <TriangleAlert /> : <CircleCheck />}
              <AlertDescription>
                {run.error
                  ? t('admin.playerzone.resultError', { processed: run.processed, total: run.total })
                  : run.stopped
                    ? t('admin.playerzone.resultStopped', { processed: run.processed, total: run.total })
                    : t('admin.playerzone.resultDone')}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <div className="text-lg font-semibold tabular-nums">{run.updated}</div>
                <div className="text-xs text-muted-foreground">{t('admin.playerzone.updated')}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-lg font-semibold tabular-nums">{run.unrated}</div>
                <div className="text-xs text-muted-foreground">{t('admin.playerzone.unrated')}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-lg font-semibold tabular-nums">{run.failed.length}</div>
                <div className="text-xs text-muted-foreground">{t('admin.playerzone.failed')}</div>
              </div>
            </div>
            {run.failed.length > 0 && (
              <div className="flex flex-col gap-2">
                {run.failed.map((f) => (
                  <Item key={f.rg_id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle className="truncate">{f.name ?? f.rg_id}</ItemTitle>
                      <ItemDescription>
                        {f.name ? `${f.rg_id} · ` : ''}
                        {t(`admin.playerzone.reasons.${f.reason}`)}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default PlayerzoneRefreshScreen;
