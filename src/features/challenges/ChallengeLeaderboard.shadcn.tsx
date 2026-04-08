import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ChallengePointsView } from '@/types/supabaseTypes';

const medalForPlace = (index: number) => {
  if (index === 0) return '🥇';
  else if (index === 1) return '🥈';
  else if (index === 2) return '🥉';
  else return (index + 1).toString();
};

export const ChallengeLeaderboardShadcn = ({
  challenge_points,
  isLoading,
}: {
  challenge_points: ChallengePointsView[];
  isLoading: boolean;
}) => {
  const uniqueScores = [...new Set(challenge_points.map((x) => x.total_points))].sort((a, b) => b - a);

  return (
    <div className='size-full flex flex-col gap-y-2'>
      {
        challenge_points
          .sort((a, b) => b.total_points - a.total_points)
          .map((x) => {
            const place = uniqueScores.indexOf(x.total_points);
            return <Item key={x.user} variant={"outline"}>
              <ItemContent className='flex flex-row'>
                <div className={cn("font-bold mr-1",
                  {
                    "text-xl": place >= 3,
                    "mx-2": place >= 3,
                    "text-2xl": place < 3
                  }
                )}>
                  {medalForPlace(uniqueScores.indexOf(x.total_points))}
                </div>
                <Avatar className={"mr-2"}>
                  <AvatarImage src={x.avatarUrl || undefined} alt={x.displayName || undefined} />
                  <AvatarFallback>{x.displayName ? x.displayName[0] : 'U'}</AvatarFallback>
                </Avatar>
                <ItemTitle className="line-clamp-1 font-semibold flex px-2">
                  {x.displayName}
                </ItemTitle>
              </ItemContent>
            </Item>
          })
      }
    </div>
  );
};
