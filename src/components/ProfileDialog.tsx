import pzLogo from '../images/pz_logo.svg';

import { DialogProps } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useUserTrophies } from '@/tanstack/challenge';
import { usePlayerLeaderboardEntry, usePlayerMatches } from '@/tanstack/games';
import { useEloHistoryForPlayer } from '@/tanstack/player_data';
import { useProfile } from '@/tanstack/user';
import { AlertCircle, Copy, Medal, TrendingDown, TrendingUp, WifiOff, X } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader } from './ui/dialog';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from './ui/item';
import { Skeleton } from './ui/skeleton';

type ProfilePayload = {
  userId: string;
};

type EloPoint = { new_rating: number; created_at: string };

const StatTileSkeleton = () => (
  <Item variant="outline">
    <ItemContent>
      <Skeleton className="h-5 w-12 mb-1" />
      <Skeleton className="h-3 w-20" />
    </ItemContent>
  </Item>
);

const StatTileError = ({ label }: { label: string }) => (
  <Item variant="outline" className="border-destructive/30">
    <ItemContent>
      <ItemTitle className="text-destructive/70 gap-1">
        <AlertCircle className="size-3.5" />
        Fehler
      </ItemTitle>
      <ItemDescription>{label}</ItemDescription>
    </ItemContent>
  </Item>
);

const SectionError = ({ label }: { label: string }) => (
  <div className="mt-4 rounded-lg border border-destructive/20 p-3 flex items-center gap-2 text-sm text-muted-foreground">
    <AlertCircle className="size-4 shrink-0 text-destructive/70" />
    {label} konnte nicht geladen werden
  </div>
);

const EloSparkline = ({ history }: { history: EloPoint[] }) => {
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

  const isUp = ratings[ratings.length - 1] >= ratings[0];
  const color = isUp ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="elo-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#elo-spark-fill)" />
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

export const ProfileDialog = ({ payload: { userId }, onClose }: DialogProps<ProfilePayload, null>) => {
  const { t } = useTranslation();
  const isOffline = useIsOffline();
  const { user: currentUser } = useGrants();
  const { data: currentUserProfile } = useProfile(currentUser.id);
  const currentPlayerId = currentUserProfile?.player?.player ?? '';

  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile(userId);
  const { data: trophies = [], isLoading: trophiesLoading, isError: trophiesError } = useUserTrophies(userId);
  const { data: leaderboardEntry, isLoading: leaderboardLoading, isError: leaderboardError } = usePlayerLeaderboardEntry(userId);

  const playerId = profile?.player?.player ?? '';
  const { data: playerMatches = [], isLoading: matchesLoading, isError: matchesError } = usePlayerMatches(playerId);
  const { data: eloHistory = [], isLoading: eloLoading, isError: eloError } = useEloHistoryForPlayer(playerId);

  const winRate = useMemo(() => {
    const rated = playerMatches.filter((m) => m.rated && m.winner_side);
    if (rated.length === 0) return null;
    const wins = rated.filter((m) => {
      const onTeamA = m.team_a_p1 === playerId || m.team_a_p2 === playerId;
      return (onTeamA && m.winner_side === 'A') || (!onTeamA && m.winner_side === 'B');
    }).length;
    return { wins, total: rated.length, rate: Math.round((wins / rated.length) * 100) };
  }, [playerMatches, playerId]);

  const h2h = useMemo(() => {
    if (!currentPlayerId || currentUser.id === userId || matchesLoading) return null;
    const shared = playerMatches.filter(
      (m) => m.rated && m.winner_side &&
        (m.team_a_p1 === currentPlayerId || m.team_a_p2 === currentPlayerId ||
         m.team_b_p1 === currentPlayerId || m.team_b_p2 === currentPlayerId)
    );
    if (shared.length === 0) return null;
    const wins = shared.filter((m) => {
      const onTeamA = m.team_a_p1 === currentPlayerId || m.team_a_p2 === currentPlayerId;
      return (onTeamA && m.winner_side === 'A') || (!onTeamA && m.winner_side === 'B');
    }).length;
    return { wins, losses: shared.length - wins };
  }, [playerMatches, currentPlayerId, currentUser.id, userId, matchesLoading]);

  const sortedEloHistory = useMemo(
    () => [...eloHistory].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [eloHistory]
  );

  const trend = leaderboardEntry?.trend_30_days;

  const rankStyle: Record<number, { color: string; label: string }> = {
    1: { color: 'text-yellow-500', label: '1. Platz' },
    2: { color: 'text-slate-400',  label: '2. Platz' },
    3: { color: 'text-amber-700',  label: '3. Platz' },
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogClose render={<Button variant={"ghost"} size={"icon-lg"}><X /></Button>} />
        </DialogHeader>
        <DialogBody>

          {/* Offline banner */}
          {isOffline && (
            <div className="bg-warning px-4 py-2 flex items-center justify-center gap-2 text-warning-foreground text-sm rounded-lg mb-2">
              <WifiOff className="size-4 shrink-0" />
              {t('profile.offline')}
            </div>
          )}

          {/* Profile header */}
          {profileLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="size-30 rounded-full" />
              <Skeleton className="h-7 w-36 mt-2" />
            </div>
          ) : (
            <div className='flex flex-col items-center'>
              <Avatar className={"size-30"}>
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback>{profile?.displayName ? profile.displayName[0] : 'U'}</AvatarFallback>
              </Avatar>
              <div className='text-2xl mt-4'>{profile?.displayName}</div>
            </div>
          )}

          {/* Stat grid */}
          <div className='grid grid-cols-2 gap-4 mt-4'>
            {/* Profile-sourced tiles */}
            {profileLoading ? (
              <>
                <StatTileSkeleton />
                <StatTileSkeleton />
              </>
            ) : profileError ? (
              <StatTileError label="Spielerdaten" />
            ) : (
              <>
                {profile?.player?.effective_rating_cached && (
                  <Item variant={"outline"}>
                    <ItemContent>
                      <ItemTitle>{profile.player.effective_rating_cached.toFixed()}</ItemTitle>
                      <ItemDescription>Effektiver Index</ItemDescription>
                    </ItemContent>
                  </Item>
                )}
                {!!profile?.player?.matches_played && (
                  <Item variant={"outline"}>
                    <ItemContent>
                      <ItemTitle>{profile.player.matches_played.toFixed()}</ItemTitle>
                      <ItemDescription>Gespielte Matches</ItemDescription>
                    </ItemContent>
                  </Item>
                )}
              </>
            )}

            {/* Ranking tile */}
            {leaderboardLoading ? (
              <StatTileSkeleton />
            ) : leaderboardError ? (
              <StatTileError label="Ranking" />
            ) : leaderboardEntry?.position ? (
              <Item variant={"outline"}>
                <ItemContent>
                  <ItemTitle className="flex items-center gap-1.5">
                    #{leaderboardEntry.position}
                    {trend != null && trend !== 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-normal ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {Math.abs(trend).toFixed(0)}
                      </span>
                    )}
                  </ItemTitle>
                  <ItemDescription>Ranking</ItemDescription>
                </ItemContent>
              </Item>
            ) : null}

            {/* Win rate tile */}
            {matchesLoading ? (
              <StatTileSkeleton />
            ) : matchesError ? (
              <StatTileError label="Gewinnrate" />
            ) : winRate !== null ? (
              <Item variant={"outline"}>
                <ItemContent>
                  <ItemTitle>{winRate.rate}%</ItemTitle>
                  <ItemDescription>Gewinnrate</ItemDescription>
                </ItemContent>
              </Item>
            ) : null}

            {/* H2H tiles */}
            {h2h !== null && (
              <>
                <Item variant={"outline"}>
                  <ItemContent>
                    <ItemTitle>{h2h.wins}</ItemTitle>
                    <ItemDescription>{t('profile.h2h.wins')}</ItemDescription>
                  </ItemContent>
                </Item>
                <Item variant={"outline"}>
                  <ItemContent>
                    <ItemTitle>{h2h.losses}</ItemTitle>
                    <ItemDescription>{t('profile.h2h.losses')}</ItemDescription>
                  </ItemContent>
                </Item>
              </>
            )}

            {/* RG tiles (profile-sourced, shown after loading) */}
            {!profileLoading && !profileError && (
              <>
                {profile?.player?.rg_id && (
                  <Item variant={"outline"}>
                    <ItemMedia className='flex flex-row h-full align-center justify-center'>
                      <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{profile.player.rg_id}</ItemTitle>
                      <ItemDescription>RG ID</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant={"outline"} size={"icon-lg"} onClick={() => {
                        navigator.clipboard.writeText(profile?.player?.rg_id ?? '');
                        toast.success('RG ID in die Zwischenablage kopiert');
                      }}>
                        <Copy />
                      </Button>
                    </ItemActions>
                  </Item>
                )}
                {profile?.player?.rg_index && (
                  <Item variant={"outline"}>
                    <ItemMedia className='flex flex-row h-full align-center justify-center'>
                      <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{profile.player.rg_index}</ItemTitle>
                      <ItemDescription>RG Index</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {profile.player.pro_status && (
                        <Badge variant="outline" className='border-2 border-black bg-black text-white'>
                          Pro
                        </Badge>
                      )}
                    </ItemActions>
                  </Item>
                )}
              </>
            )}
          </div>

          {/* ELO sparkline */}
          {eloLoading ? (
            <div className="mt-4 rounded-lg border p-3">
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-10" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ) : eloError ? (
            <SectionError label="ELO Verlauf" />
          ) : sortedEloHistory.length >= 2 ? (
            <div className="mt-4 rounded-lg border p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">ELO Verlauf</span>
                <span className={`text-sm font-medium ${
                  sortedEloHistory[sortedEloHistory.length - 1].new_rating >= sortedEloHistory[0].new_rating
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}>
                  {sortedEloHistory[sortedEloHistory.length - 1].new_rating >= sortedEloHistory[0].new_rating ? '+' : ''}
                  {(sortedEloHistory[sortedEloHistory.length - 1].new_rating - sortedEloHistory[0].new_rating).toFixed(0)}
                </span>
              </div>
              <EloSparkline history={sortedEloHistory} />
            </div>
          ) : null}

          {/* Trophies */}
          {trophiesLoading ? (
            <div className="flex flex-col gap-2 mt-4">
              <Skeleton className="h-4 w-20 ml-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : trophiesError ? (
            <SectionError label="Challenges" />
          ) : trophies.length > 0 ? (
            <div className='flex flex-col gap-2 mt-4'>
              <div className="text-sm font-semibold ml-2">Challenges</div>
              {trophies.map((trophy) => {
                const style = rankStyle[trophy.rank];
                return (
                  <Item key={trophy.challenge_id} variant={"outline"}>
                    <ItemMedia>
                      <Medal className={`size-6 ${style.color}`} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{trophy.challenge_name}</ItemTitle>
                      <ItemDescription>{style.label}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <span className="text-sm font-medium">{trophy.score} Pkt</span>
                    </ItemActions>
                  </Item>
                );
              })}
            </div>
          ) : null}

        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
