import { ListSkeleton } from '@/components/list/ListParts';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ChallengePointsView } from '@/types/supabaseTypes';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Dense rank per score: everyone with the same points shares a place. */
export const rankLeaderboard = (points: ChallengePointsView[]) => {
  const sorted = [...points].sort((a, b) => b.total_points - a.total_points);
  const scores = [...new Set(sorted.map((x) => x.total_points))];
  return sorted.map((entry) => ({ entry, place: scores.indexOf(entry.total_points) }));
};

/** Places 1–3 of an ended challenge, shown as 2nd · 1st · 3rd. Tied players share a place. */
export const ChallengePodium = ({ challenge_points }: { challenge_points: ChallengePointsView[] }) => {
  const { t } = useTranslation();
  const places = useMemo(() => {
    const ranked = rankLeaderboard(challenge_points);
    return [0, 1, 2].map((place) => ranked.filter((x) => x.place === place).map((x) => x.entry));
  }, [challenge_points]);

  if (places[0].length === 0) return null;

  return (
    <div role="list" aria-label={t('challenge.info.podium')} className="grid grid-cols-3 items-end gap-2">
      {[1, 0, 2].map((place) => {
        const entries = places[place];
        if (entries.length === 0) return <div key={place} />;
        return (
          <div
            key={place}
            role="listitem"
            className={cn('flex min-w-0 flex-col items-center gap-1 rounded-lg bg-muted/50 px-1 py-2 text-center', place === 0 && 'bg-primary/10 pb-4')}
          >
            <span className={cn('leading-none', place === 0 ? 'text-3xl' : 'text-2xl')} aria-label={t('challenge.info.place', { place: place + 1 })}>
              {MEDALS[place]}
            </span>
            <AvatarGroup>
              {entries.slice(0, 3).map((x) => (
                <Avatar key={x.user} className={cn(place === 0 && 'size-10')}>
                  <AvatarImage src={x.avatarUrl || undefined} alt={x.displayName || undefined} />
                  <AvatarFallback>{x.displayName ? x.displayName[0] : 'U'}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <span className="line-clamp-2 w-full text-xs font-medium break-words">{entries.map((x) => x.displayName).join(', ')}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{t('challenge.info.points', { count: entries[0].total_points })}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ChallengeLeaderboard = ({
  challenge_points,
  isLoading,
  currentUserId,
}: {
  challenge_points: ChallengePointsView[];
  isLoading: boolean;
  currentUserId: string;
}) => {
  const { t } = useTranslation();
  const ranked = useMemo(() => rankLeaderboard(challenge_points), [challenge_points]);

  if (isLoading) return <ListSkeleton rows={5} />;

  if (ranked.length === 0) {
    return (
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trophy />
          </EmptyMedia>
          <EmptyTitle>{t('challenge.info.leaderboardEmpty')}</EmptyTitle>
          <EmptyDescription>{t('challenge.info.leaderboardEmptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {ranked.map(({ entry, place }) => {
        const isMe = entry.user === currentUserId;
        return (
          <Item key={entry.user} variant="outline" className={cn(isMe && 'border-primary/50 bg-primary/5')}>
            <ItemMedia>
              <div className={cn('w-8 text-center text-sm font-semibold text-muted-foreground', place < 3 && 'text-xl')}>
                {place < 3 ? MEDALS[place] : `${place + 1}.`}
              </div>
            </ItemMedia>
            <ItemContent className="flex-row items-center gap-3">
              <Avatar>
                <AvatarImage src={entry.avatarUrl || undefined} alt={entry.displayName || undefined} />
                <AvatarFallback>{entry.displayName ? entry.displayName[0] : 'U'}</AvatarFallback>
              </Avatar>
              <ItemTitle className="min-w-0 flex-1 font-semibold">
                <span className="truncate">{entry.displayName}</span>
                {isMe && <Badge variant="info">{t('challenge.info.you')}</Badge>}
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <span className="text-base font-bold tabular-nums">{entry.total_points}</span>
            </ItemActions>
          </Item>
        );
      })}
    </div>
  );
};
