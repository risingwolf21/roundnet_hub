import pzLogo from '../images/pz_logo.svg';

import { DialogProps } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useIsOffline } from '@/hooks/useIsOffline';
import { cn } from '@/lib/utils';
import { useUserTrophies } from '@/tanstack/challenge';
import { usePlayerLeaderboardEntry, usePlayerMatches } from '@/tanstack/games';
import { useEloHistoryForPlayer } from '@/tanstack/player_data';
import { useProfile } from '@/tanstack/user';
import { getInitials } from '@/utils';
import { AlertCircle, Copy, EyeOff, Medal, TrendingDown, TrendingUp, WifiOff } from 'lucide-react';
import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ListSectionHeader } from './list/ListParts';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from './ui/item';
import { Skeleton } from './ui/skeleton';

type ProfilePayload = {
  userId: string;
};

type EloPoint = { new_rating: number; created_at: string };

const StatTile = ({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) => (
  <div className="flex flex-col items-center rounded-lg bg-muted px-2 py-3 text-center">
    <span className="flex items-center gap-1.5 text-xl font-bold tabular-nums">
      {value}
      {extra}
    </span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

const SectionError = ({ label }: { label: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-card p-3 text-sm text-muted-foreground">
      <AlertCircle className="size-4 shrink-0 text-destructive/70" />
      {t('profile.dialog.loadFailed', { label })}
    </div>
  );
};

const EloSparkline = ({ history, positive }: { history: EloPoint[]; positive: boolean }) => {
  const gradientId = useId();
  if (history.length < 2) return null;

  const ratings = history.map((d) => d.new_rating);
  const min = Math.min(...ratings) - 2;
  const max = Math.max(...ratings) + 2;
  const range = max - min || 1;
  const W = 240, H = 48;

  const toX = (i: number) => (i / (ratings.length - 1)) * W;
  const toY = (r: number) => H - ((r - min) / range) * H;

  const linePoints = ratings.map((r, i) => `${toX(i)},${toY(r)}`).join(' ');
  const areaPoints = `0,${H} ${linePoints} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('h-12 w-full', positive ? 'text-success' : 'text-destructive')}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export const ProfileDialog = ({ payload: { userId }, onClose }: DialogProps<ProfilePayload, null>) => {
  const { t } = useTranslation();
  const isOffline = useIsOffline();
  const { user: currentUser, hasPerm } = useGrants();
  const { data: currentUserProfile } = useProfile(currentUser.id);
  const currentPlayerId = currentUserProfile?.player?.player ?? '';
  const isSelf = currentUser.id === userId;

  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile(userId);
  const { data: trophies = [], isLoading: trophiesLoading, isError: trophiesError } = useUserTrophies(userId);
  const { data: leaderboardEntry, isLoading: leaderboardLoading } = usePlayerLeaderboardEntry(userId);

  const playerId = profile?.player?.player ?? '';
  const { data: playerMatches = [], isLoading: matchesLoading } = usePlayerMatches(playerId);
  const { data: eloHistory = [], isLoading: eloLoading, isError: eloError } = useEloHistoryForPlayer(playerId);

  const player = profile?.player;
  const displayName = profile?.displayName ?? '';
  // The index is private when the player hides it; they still see their own.
  const indexHidden = !isSelf && !!player?.hide_rating;
  const canSeeActivity = hasPerm('users.manage');

  const record = useMemo(() => {
    if (!currentPlayerId || matchesLoading) return null;
    const shared = playerMatches.filter(
      (m) => m.rated && m.winner_side &&
        (m.team_a_p1 === currentPlayerId || m.team_a_p2 === currentPlayerId ||
          m.team_b_p1 === currentPlayerId || m.team_b_p2 === currentPlayerId)
    );
    if (shared.length === 0) return null;

    const wins = shared.filter((m) => {
      const onTeamA = m.team_a_p1 === currentPlayerId || m.team_a_p2 === currentPlayerId;
      return (onTeamA && m.winner_side === 'team_a') || (!onTeamA && m.winner_side === 'team_b');
    }).length;
    const draws = shared.filter((m) => m.winner_side === 'draw').length;
    return { wins, draws, losses: shared.length - wins - draws, total: shared.length, rate: Math.round((wins / shared.length) * 100) };
  }, [currentPlayerId, matchesLoading, playerMatches]);

  const sortedEloHistory = useMemo(
    () => [...eloHistory].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [eloHistory]
  );
  const eloDelta = sortedEloHistory.length >= 2
    ? sortedEloHistory[sortedEloHistory.length - 1].new_rating - sortedEloHistory[0].new_rating
    : 0;

  const trend = leaderboardEntry?.trend_30_days;

  const rankStyle: Record<number, { color: string; label: string }> = {
    1: { color: 'text-yellow-500', label: t('profile.dialog.place1') },
    2: { color: 'text-slate-400', label: t('profile.dialog.place2') },
    3: { color: 'text-amber-700', label: t('profile.dialog.place3') },
  };

  const hasStats = !!leaderboardEntry?.position || (!indexHidden && !!player?.effective_rating_cached) ||
    !!player?.matches_played || (isSelf && !!record);

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant="fullscreen">
        <DialogHeader variant="appbar">
          <DialogTitle className="flex-1">{t('profile.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3 bg-muted/30 p-3 pb-safe-bottom">
          {isOffline && (
            <Alert variant="warning">
              <WifiOff />
              <AlertDescription>{t('profile.offline')}</AlertDescription>
            </Alert>
          )}

          {/* Hero */}
          <div className="flex flex-col items-center gap-1 rounded-xl border bg-card px-4 py-6 text-center">
            {profileLoading ? (
              <>
                <Skeleton className="size-24 rounded-full" />
                <Skeleton className="mt-3 h-7 w-36" />
              </>
            ) : (
              <>
                <Avatar className="size-24">
                  <AvatarImage src={profile?.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-2xl">{getInitials(displayName).slice(0, 2) || 'U'}</AvatarFallback>
                </Avatar>
                <h2 className="mt-3 max-w-full truncate text-2xl font-semibold">{displayName}</h2>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {isSelf && <Badge variant="secondary">{t('groups.you')}</Badge>}
                  {player?.pro_status && !indexHidden && (
                    <Badge variant="outline" className="border-black bg-black text-white">{t('profile.dialog.pro')}</Badge>
                  )}
                </div>
                {canSeeActivity && profile?.user?.last_seen_at && (
                  <p className="text-sm text-muted-foreground">
                    {t('profile.lastSeenAt', { date: new Date(profile.user.last_seen_at) })}
                  </p>
                )}
              </>
            )}
          </div>

          {profileError && <SectionError label={t('profile.dialog.playerData')} />}

          {/* Stats */}
          {(profileLoading || leaderboardLoading) ? (
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-[74px] rounded-lg" />
              <Skeleton className="h-[74px] rounded-lg" />
              <Skeleton className="h-[74px] rounded-lg" />
            </div>
          ) : hasStats ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {!!leaderboardEntry?.position && (
                <StatTile
                  label={t('profile.dialog.ranking')}
                  value={`#${leaderboardEntry.position}`}
                  extra={trend != null && trend !== 0 ? (
                    <span className={cn('flex items-center gap-0.5 text-xs font-normal', trend > 0 ? 'text-success' : 'text-destructive')}>
                      {trend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {Math.abs(trend).toFixed(0)}
                    </span>
                  ) : undefined}
                />
              )}
              {!indexHidden && !!player?.effective_rating_cached && (
                <StatTile label={t('profile.dialog.effectiveIndex')} value={player.effective_rating_cached.toFixed()} />
              )}
              {!!player?.matches_played && (
                <StatTile label={t('profile.dialog.matchesPlayed')} value={player.matches_played.toFixed()} />
              )}
              {isSelf && record && <StatTile label={t('profile.dialog.winRate')} value={`${record.rate}%`} />}
            </div>
          ) : null}

          {indexHidden && (
            <Alert variant="info">
              <EyeOff />
              <AlertDescription>{t('profile.dialog.indexHidden', { name: displayName })}</AlertDescription>
            </Alert>
          )}

          {/* Your record against / with this player */}
          {!isSelf && record && (
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-semibold">{t('profile.dialog.recordTitle', { name: displayName })}</div>
              <div className="text-xs text-muted-foreground">{t('profile.dialog.recordDescription', { count: record.total })}</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatTile label={t('profile.dialog.wins')} value={record.wins} />
                <StatTile label={t('profile.dialog.draws')} value={record.draws} />
                <StatTile label={t('profile.dialog.losses')} value={record.losses} />
              </div>
            </div>
          )}

          {/* ELO history */}
          {!indexHidden && (eloLoading ? (
            <Skeleton className="h-[104px] w-full rounded-xl" />
          ) : eloError ? (
            <SectionError label={t('profile.dialog.eloHistory')} />
          ) : sortedEloHistory.length >= 2 ? (
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{t('profile.dialog.eloHistory')}</span>
                <span className={cn('text-sm font-medium tabular-nums', eloDelta >= 0 ? 'text-success' : 'text-destructive')}>
                  {eloDelta >= 0 ? '+' : ''}{eloDelta.toFixed(0)}
                </span>
              </div>
              <EloSparkline history={sortedEloHistory} positive={eloDelta >= 0} />
            </div>
          ) : null)}

          {/* Playerzone */}
          {!profileLoading && !profileError && (player?.rg_id || (!indexHidden && player?.rg_index)) && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('profile.dialog.playerzone')} />
              {player?.rg_id && (
                <Item variant="outline">
                  <ItemMedia>
                    <img src={pzLogo} alt={t('profile.dialog.pzLogoAlt')} width="20" height="20" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{player.rg_id}</ItemTitle>
                    <ItemDescription>{t('profile.dialog.rgId')}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label={t('profile.dialog.copyRgId')}
                      onClick={() => {
                        navigator.clipboard.writeText(player.rg_id ?? '');
                        toast.success(t('profile.dialog.rgIdCopied'));
                      }}
                    >
                      <Copy />
                    </Button>
                  </ItemActions>
                </Item>
              )}
              {!indexHidden && player?.rg_index && (
                <Item variant="outline">
                  <ItemMedia>
                    <img src={pzLogo} alt={t('profile.dialog.pzLogoAlt')} width="20" height="20" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{player.rg_index}</ItemTitle>
                    <ItemDescription>{t('profile.dialog.rgIndex')}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    {player.pro_status && (
                      <Badge variant="outline" className="border-black bg-black text-white">{t('profile.dialog.pro')}</Badge>
                    )}
                  </ItemActions>
                </Item>
              )}
            </section>
          )}

          {/* Trophies */}
          {trophiesLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : trophiesError ? (
            <SectionError label={t('navigation.challenges')} />
          ) : trophies.length > 0 ? (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('navigation.challenges')} count={trophies.length} />
              {trophies.map((trophy) => {
                const style = rankStyle[trophy.rank];
                return (
                  <Item key={trophy.challenge_id} variant="outline">
                    <ItemMedia>
                      <Medal className={cn('size-6', style?.color ?? 'text-muted-foreground')} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{trophy.challenge_name}</ItemTitle>
                      {style && <ItemDescription>{style.label}</ItemDescription>}
                    </ItemContent>
                    <ItemActions>
                      <span className="text-sm font-medium">{t('profile.dialog.points', { score: trophy.score })}</span>
                    </ItemActions>
                  </Item>
                );
              })}
            </section>
          ) : null}

          {!profileLoading && !profileError && !hasStats && !record && trophies.length === 0 && !trophiesLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('profile.dialog.noData', { name: displayName })}</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
