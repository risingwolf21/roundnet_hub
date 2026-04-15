import { PullToRefresh } from "@/components/pull-to-refresh/PullToRefresh";
import { AppBar } from "@/components/ui/appbar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { authKeys } from "@/tanstack/auth";
import { useGroups, useJoinGroup, useRequestedUsersPerGroup } from "@/tanstack/groups";
import { captureException } from "@sentry/react";
import { useDialogs } from "@toolpad/core";
import { AlertCircle, Loader2, Plus, SearchX, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { CreateOrUpdateGroupDialogShadcn } from "./dialogs/CreateOrUpdateGroupDialog.shadcn";

const JoinGroupButton = ({ group, user }: { group: Group; user: User }) => {
  const { refetchUserGrants } = useGrants();
  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user");

  return (
    <Button
      disabled={joinGroup.isPending}
      onClick={(event) => {
        joinGroup.mutate(undefined, {
          onError: (e) => {
            captureException(e);
            toast.error("Der Gruppe konnte nicht beigetreten werden.");
          },
          onSuccess: () => {
            refetchUserGrants();
          },
        });
        event.stopPropagation();
      }}
    >
      {joinGroup.isPending ? "Tritt bei..." : group.need_request_to_join ? "Anfragen" : "Beitreten"}
    </Button>
  );
}

export const PublicGroupListShadcn = () => {

  const { user } = useGrants();
  const navigate = useNavigate();
  const dialogs = useDialogs();

  const { data: groups = [], error, isLoading, refetch } = useGroups();
  const { data: requested_group_joins = [], refetch: refetchRequested } = useRequestedUsersPerGroup(user);


  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={"Gruppen"}
      primaryAction="default"
      user={user}
      actions={
        <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
          const result = await dialogs.open(CreateOrUpdateGroupDialogShadcn, { user });
          if (result && result !== 'closed') {
            refetch();
            toast.success('Gruppe wurde erfolgreich erstellt.');
          } else if (!result) {
            toast.error('Gruppe konnte nicht erstellt werden.');
          }
        }}>
          <Plus />
        </Button>
      }
    />

    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh
        onRefresh={() => {
          refetch();
          refetchRequested();
          queryClient.invalidateQueries({ queryKey: authKeys.currentUserGrants(user.id) });
        }}
      >
        <div
          className="flex flex-col p-4 space-y-2"
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
              <AlertCircle className="size-10 text-destructive mb-4" />
              <h2 className="text-xl font-bold tracking-tight">Fehler beim Laden</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">
                Die Gruppen konnten nicht geladen werden. Bitte versuche es später erneut.
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <SearchX className="size-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Keine Gruppen gefunden</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">
                Es gibt aktuell keine öffentlichen Gruppen. Erstelle eine neue Gruppe, um zu beginnen.
              </p>
            </div>
          ) : (
            groups
              .filter((x) => x.parent_group === null)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((mainGroup) => (
                <div key={mainGroup.id} className="gap-2 flex w-full flex-col">
                  {
                    groups.filter((x) => x.parent_group === null).length > 1 && <div className="text-sm font-semibold mb-2">
                      {mainGroup.name}
                    </div>
                  }
                  {groups
                    .filter((x) => x.parent_group === mainGroup.id || x.id === mainGroup.id)
                    .filter((x) => x.visible || x.user_group_role !== null)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((x) => (
                      <div key={x.id} className="flex flex-row items-center gap-3 border-b last:border-0 pb-2"
                        onClick={() => {
                          if (x.user_group_role && x.user_group_role !== "joinRequested") {
                            navigate("/groups/" + x.id);
                          }
                        }}>
                        <Avatar className="flex h-10 w-10 flex-col items-center bg-[color:var(--group-color)]"
                          style={{ "--group-color": x.color } as React.CSSProperties}>
                          <div className="h-full flex flex-row items-center">
                            <Users
                              className="h-5 w-5"
                              style={{ color: "color-mix(in srgb, var(--group-color), white 70%)" }} />
                          </div>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-col items-start justify-between">
                            <p className="text-sm font-semibold">{x.name}</p>
                            <p className="text-sm text-foreground/90 ">{x.description}</p>
                          </div>
                        </div>
                        {
                          !x.user_group_role && <div className="flex-shrink flex-end">
                            <JoinGroupButton group={x} user={user} />
                          </div>
                        }
                        {x.user_group_role === 'admin' && (
                          <Badge variant="outline" className="text-info">
                            Admin
                          </Badge>
                        )}
                        {x.user_group_role === 'admin' && requested_group_joins.find((y) => y.group === x.id) && (
                          <Badge variant="outline" className="text-warning">
                            {requested_group_joins.filter((y) => y.group === x.id).length}
                          </Badge>
                        )}
                        {x.user_group_role === 'joinRequested' && (
                          <Badge variant="outline" className="text-warning">
                            Angefragt
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              ))
          )}
        </div>
      </PullToRefresh>
    </main>
  </div>
}