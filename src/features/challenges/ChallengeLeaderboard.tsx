import { ListSkeleton } from '@/components/list/ListParts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
