import { PullToRefresh } from "@/components/PullToRefresh";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useDialogs } from "@/contexts/DialogsProvider";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { adminKeys, useUnlinkedPlayers } from "@/tanstack/admin";
import { gamesKeys } from "@/tanstack/games";
import { playerDataKeys } from "@/tanstack/player_data";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";

const UserPlayerMapping = () => {

  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data = [], refetch } = useUnlinkedPlayers();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppBar
        className='!border-b !shadow-sm'
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom overflow-y-auto'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="p-2 gap-2">
            {
              data.map(x => (
                <Item key={x.player} variant={"outline"}>
                  <ItemMedia>
                    <Avatar className={"mr-2"}>
                      <AvatarImage src={x.rg_avatar_url || undefined} alt={x.display_name || undefined} />
                      <AvatarFallback>{x.display_name ? x.display_name[0] : 'U'}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{x.display_name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Button onClick={async () => {
                      const result = await dialogs.selectSingleUser();

                      if (result) {

                        const isConfirmed = await dialogs.confirm("Möchtest du wirklich diese beiden Accounts mergen? " + x.display_name + " und " + result.name);

                        if (!isConfirmed) {
                          toast.info("Der Merge wurde abgebrochen");
                          return;
                        }

                        const { error } = await supabase.schema("games").rpc("merge_guest_player", {
                          p_guest_player_id: x.player,
                          p_user_id: result.id
                        });
                        if (error) {
                          toast.error(error.message);
                        } else {
                          toast.success("Die Accounts wurden erfolgreich gemerged!");

                          queryClient.invalidateQueries({ queryKey: gamesKeys.all });
                          queryClient.invalidateQueries({ queryKey: adminKeys.unlinkedPlayers() });
                          queryClient.invalidateQueries({ queryKey: playerDataKeys.all });
                        }
                      }
                    }}>
                      Zuordnen
                    </Button>
                  </ItemActions>
                </Item>
              ))
            }
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
}

export default UserPlayerMapping;