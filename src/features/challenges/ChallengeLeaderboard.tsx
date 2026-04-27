import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ChallengePointsView } from '@/types/supabaseTypes';

const medalForPlace = (index: number) => {
  if (index === 0) return '🥇';
  else if (index === 1) return '🥈';
  else if (index === 2) return '🥉';
  else return (index + 1).toString() + ".";
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
              <ItemMedia>
                <Avatar className={"flex flex-row justify-center bg-none after:!border-none"}>
                  <div className={cn("flex text-base flex-col justify-center",
                    {
                      "text-xl": place < 3
                    }
                  )}>
                    {medalForPlace(uniqueScores.indexOf(x.total_points))}
                  </div>
                </Avatar>
              </ItemMedia>
              <ItemContent className='flex flex-row w-full'>
                <Avatar className={"mr-2"}>
                  <AvatarImage src={x.avatarUrl || undefined} alt={x.displayName || undefined} />
                  <AvatarFallback>{x.displayName ? x.displayName[0] : 'U'}</AvatarFallback>
                </Avatar>
                <ItemTitle className="line-clamp-1 font-semibold flex px-2 flex-1">
                  {x.displayName}
                </ItemTitle>
              </ItemContent>
              <ItemActions>
                <div className='text-base font-bold'>
                  {x.total_points}
                </div>
              </ItemActions>
            </Item>
          })
      }
    </div>
  );
};
