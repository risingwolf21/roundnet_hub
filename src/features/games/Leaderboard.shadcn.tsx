import { useCustomDialogs } from "@/components/dialogs/useShadcnDialogs";
import { PullToRefresh } from "@/components/pull-to-refresh/PullToRefresh";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/tanstack/games";
import { useTranslation } from "react-i18next";
import { useGrants } from "../auth/GrantsContext";
import { GameHistoryDialogShadcn } from "./dialogs/GameHistoryDialog.shadcn";

const LeaderboardShadcn = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const { data: leaderboard = [], isLoading, isFetching, refetch } = useLeaderboard(0);

  const dialogs = useCustomDialogs();

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Rangliste"
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={refetch}>
          <div className="flex flex-col gap-2 p-2">
            {
              leaderboard.map((entry) => (
                <div key={entry.player_id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-lg mr-2">{entry.position}.</div>
                    <Avatar>
                      <AvatarImage src={entry.avatar_url || undefined} alt={entry.name || undefined} />
                      <AvatarFallback>{entry.name ? entry.name[0] : 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div>{entry.name}</div>
                    </div>
                  </div>
                  <Button variant={"outline"} onClick={(e) => {
                    e.stopPropagation();
                    if (entry.player_id && entry.name && entry.rating)
                      dialogs.open(GameHistoryDialogShadcn, { player_id: entry.player_id, name: entry.name, rating: entry.rating.toFixed() })
                  }}>
                    {entry.rating?.toFixed() + ' ' + ((entry.trend_30_days ?? 0) > 0 ? '↗️' : (entry.trend_30_days ?? 0) < 0 ? '↘️' : '↔️')}
                  </Button>
                </div>
              ))
            }
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
}

export default LeaderboardShadcn;