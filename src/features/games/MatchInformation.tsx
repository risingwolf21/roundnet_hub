import { DangerZone } from '@/components/DangerZone';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useDeleteMatch, useMatch } from '@/tanstack/games';
import { ChevronDown, Lock, Pencil, SearchX, Trash2, Trophy } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { ReportSetsDialog } from './dialogs/ReportSetsDialog';

type Slot = { player: Player | null; user: User | null };

const slotName = (slot: Slot) => slot.user?.name ?? slot.player?.display_name ?? '';

const PlayerAvatar = ({ slot, className }: { slot: Slot; className?: string }) => {
  const dialogs = useDialogs();
  return (
    <Avatar className={className} onClick={() => slot.user && dialogs.userProfile(slot.user.id)}>
      <AvatarImage src={slot.user?.avatarUrl || undefined} alt={slotName(slot)} />
      <AvatarFallback>{slotName(slot)[0] ?? 'U'}</AvatarFallback>
    </Avatar>
  );
};

const TeamColumn = ({ slots, winner, mine }: { slots: Slot[]; winner: boolean; mine: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="flex h-5 items-center gap-1.5">
        {winner && <Trophy className="size-4 text-warning" />}
        {mine && <Badge variant="secondary">{t('games.list.you')}</Badge>}
      </div>
      <div className="flex gap-2">
        {slots.map((slot, i) => (
          <PlayerAvatar
            key={slot.player?.player ?? i}
            slot={slot}
            className={cn('size-12 shadow-sm', winner && 'ring-2 ring-warning/60')}
          />
        ))}
      </div>
      <div className="flex w-full flex-col items-center">
        {slots.map((slot, i) => (
          <span key={slot.player?.player ?? i} className={cn('w-full truncate text-center text-sm', winner ? 'font-bold' : 'font-medium')}>
            {slotName(slot)}
          </span>
        ))}
      </div>
    </div>
  );
};

const Card = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const MatchSkeleton = () => (
  <div className="flex flex-col gap-3 p-4">
    <Skeleton className="h-44 w-full rounded-xl" />
    <Skeleton className="h-28 w-full rounded-xl" />
    <Skeleton className="h-40 w-full rounded-xl" />
  </div>
);

const MatchInformation = () => {
  const { t, i18n } = useTranslation();
  const { matchId } = useParams();
  const { user, hasPerm } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [applyingElo, setApplyingElo] = useState(false);

  const { data: match, isLoading, refetch } = useMatch(matchId);
  const deleteMatch = useDeleteMatch(matchId);

  const appBar = <AppBar className="!border-b !shadow-sm" title={t('games.information.title')} user={user} primaryAction="back" />;

  if (isLoading) {
    return (
      <div>
        {appBar}
        <MatchSkeleton />
      </div>
    );
  }

  if (!match) {
    return (
      <div>
        {appBar}
        <Empty className="mt-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t('games.information.notFound')}</EmptyTitle>
            <EmptyDescription>{t('games.information.notFoundDescription')}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => navigate('/matches')}>
            {t('games.information.backToList')}
          </Button>
        </Empty>
      </div>
    );
  }

  const sets = [...match.sets].sort((a, b) => a.set_number - b.set_number);
  const normalSets = sets.filter((x) => x.type !== 'spezi');
  const speziSet = sets.find((x) => x.type === 'spezi') ?? null;
  const setsAWon = normalSets.filter((x) => x.team_a_score > x.team_b_score).length;
  const setsBWon = normalSets.filter((x) => x.team_a_score < x.team_b_score).length;
  const winner = setsAWon > setsBWon ? 'a' : setsBWon > setsAWon ? 'b' : null;

  const teamA: Slot[] = [match.player_1a, match.player_2a];
  const teamB: Slot[] = [match.player_1b, match.player_2b];
  const isMine = (slot: Slot) => slot.player?.linked_user_id === user.id || slot.user?.id === user.id;
  const matchMember = [...teamA, ...teamB].some(isMine);

  const canEditScores = matchMember && hasPerm('games.update.score');
  // Same rule as the row-level policy: participants with `games.delete.own`.
  const canDelete = matchMember && hasPerm('games.delete.own');

  const historyOf = (slot: Slot) => match.elo_history.find((x) => x.user === slot.player?.player);
  const hasEloHistory = match.elo_history.length > 0;

  const dateLabel = match.created_at
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(match.created_at))
    : null;

  const editScores = () =>
    dialogs.open(ReportSetsDialog, {
      matchId: match.id,
      team_a_name: match.team_a_name ?? '',
      team_b_name: match.team_b_name ?? '',
      sets: match.sets,
    });

  const handleDelete = async () => {
    if (!(await dialogs.confirm(t('games.information.deleteConfirm')))) return;
    deleteMatch.mutate(undefined, {
      onSuccess: () => navigate('/matches'),
      onError: (error) => toast.error(t('games.information.deleteError', { error: error.message })),
    });
  };

  const applyElo = async () => {
    setApplyingElo(true);
    const { error } = await supabase.schema('games').rpc('apply_elo_for_match', { p_match: match.id });
    setApplyingElo(false);
    if (error) {
      toast.error(t('games.information.applyEloError', { error: error.message }));
      return;
    }
    toast.success(t('games.information.applyEloSuccess'));
    refetch();
  };

  const setRows = [
    { key: 'a', name: match.team_a_name, scores: normalSets.map((x) => x.team_a_score), other: normalSets.map((x) => x.team_b_score) },
    { key: 'b', name: match.team_b_name, scores: normalSets.map((x) => x.team_b_score), other: normalSets.map((x) => x.team_a_score) },
  ];

  return (
    <div>
      {appBar}
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex flex-col gap-3 p-4">
            <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {dateLabel && <span className="text-xs text-muted-foreground">{dateLabel}</span>}
                {!match.rated && <Badge variant="outline">{t('games.list.unrated')}</Badge>}
                {!match.is_public && (
                  <Badge variant="outline">
                    <Lock />
                    {t('games.list.private')}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                <TeamColumn slots={teamA} winner={winner === 'a'} mine={teamA.some(isMine)} />
                <div
                  className="flex h-12 items-center gap-1.5 self-center pt-5 text-4xl font-black tabular-nums"
                  aria-label={`${setsAWon} : ${setsBWon}`}
                >
                  <span className={cn(winner === 'b' && 'text-muted-foreground')}>{setsAWon}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className={cn(winner === 'a' && 'text-muted-foreground')}>{setsBWon}</span>
                </div>
                <TeamColumn slots={teamB} winner={winner === 'b'} mine={teamB.some(isMine)} />
              </div>
            </section>

            <Card
              title={t('games.sets')}
              action={
                canEditScores && (
                  <Button variant="outline" size="sm" onClick={editScores}>
                    <Pencil />
                    {t('games.information.editScores')}
                  </Button>
                )
              }
            >
              {normalSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('games.information.noScores')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="w-full py-1 text-left font-normal" />
                        {normalSets.map((set) => (
                          <th key={set.id} className="px-3 py-1 text-center font-normal whitespace-nowrap">
                            {t('games.information.setNumber', { number: set.set_number })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {setRows.map((row) => (
                        <tr key={row.key} className="border-t">
                          <td className={cn('max-w-0 truncate py-2 pr-2', winner === row.key ? 'font-bold' : 'text-muted-foreground')}>
                            {row.name}
                          </td>
                          {row.scores.map((score, i) => (
                            <td
                              key={normalSets[i].id}
                              className={cn('px-3 py-2 text-center', score > row.other[i] ? 'font-bold' : 'text-muted-foreground')}
                            >
                              {score}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {speziSet && (
                <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Spezi</span>
                    {speziSet.set_awarded && <Badge variant="success">{t('games.information.awarded')}</Badge>}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {speziSet.team_a_score} : {speziSet.team_b_score}
                  </span>
                </div>
              )}
            </Card>

            {(match.rated || hasEloHistory) && (
              <Card title={t('games.index')}>
                {!hasEloHistory && <p className="text-sm text-muted-foreground">{t('games.information.eloPending')}</p>}
                <div className="flex flex-col divide-y">
                  {[...teamA, ...teamB].map((slot, i) => {
                    const history = historyOf(slot);
                    return (
                      <div key={slot.player?.player ?? i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                        <PlayerAvatar slot={slot} />
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate font-medium">{slotName(slot)}</span>
                          {isMine(slot) && <Badge variant="secondary">{t('games.list.you')}</Badge>}
                        </div>
                        {history && (
                          <div className="flex shrink-0 items-center gap-2 tabular-nums">
                            <span className="text-sm text-muted-foreground">
                              {history.old_rating.toFixed()} → {history.new_rating.toFixed()}
                            </span>
                            <Badge variant={history.delta > 0 ? 'success' : history.delta < 0 ? 'error' : 'outline'}>
                              {history.delta > 0 ? '+' : ''}
                              {history.delta.toFixed()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Has perm={['games.admin.view', 'supabase.admin']}>
              <Card title={t('games.information.adminActions')}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{t('games.information.applyEloDescription')}</p>
                  <Button variant="outline" size="sm" disabled={applyingElo} onClick={applyElo}>
                    {applyingElo && <Spinner />}
                    {t('games.information.start')}
                  </Button>
                </div>
              </Card>
            </Has>

            <Has perm="games.admin.view">
              <Collapsible className="overflow-hidden rounded-xl border bg-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-semibold">
                  <span>{t('games.information.adminInformation')}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col divide-y border-t">
                    {match.elo_history.length === 0 && (
                      <p className="p-4 text-sm text-muted-foreground">{t('games.information.eloPending')}</p>
                    )}
                    {match.elo_history.map((elo) => {
                      const slot = [...teamA, ...teamB].find(
                        (x) => x.player?.linked_user_id === elo.user || x.player?.player === elo.user
                      );
                      return (
                        <div key={elo.id} className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 text-sm">
                          <div className="col-span-3 font-semibold">{slot ? slotName(slot) : elo.user}</div>
                          {[
                            [t('games.information.delta'), elo.delta.toFixed(2)],
                            [t('games.information.oldRating'), elo.eff_old_rating?.toFixed(2) ?? '-'],
                            [t('games.information.newRating'), elo.eff_new_rating?.toFixed(2) ?? '-'],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <div className="font-mono tabular-nums">{value}</div>
                              <div className="text-xs text-muted-foreground">{label}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Has>

            {canDelete && (
              <DangerZone
                description={t('games.information.deleteDescription')}
                actionLabel={t('games.information.delete')}
                icon={<Trash2 />}
                loading={deleteMatch.isPending}
                onAction={handleDelete}
              />
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default MatchInformation;
