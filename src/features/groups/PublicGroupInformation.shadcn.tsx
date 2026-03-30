import { PullToRefresh } from "@/components/pull-to-refresh/PullToRefresh";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Has } from "@/hooks/useGrants";
import { cn } from "@/lib/utils";
import { useChangeUserRoleMutation, useGroup, useGroupAllUsers, useLeaveGroupMutation } from "@/tanstack/groups";
import { captureException } from "@sentry/react";
import { useLocalStorageState } from "@toolpad/core";
import groupBy from "lodash.groupby";
import { CheckCircle2, CircleFadingArrowUp, GitPullRequest, Shapes, User, UserStar, XCircle } from "lucide-react";
import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { useAddUsersMutation } from "./query/addUsersMutation";
import { useRemoveUsersMutation } from "./query/removeUsersMutation";

type Filter = { user: boolean; admin: boolean; joinRequested: boolean; trials: boolean };
const DEFAULT_FILTER = { user: true, admin: true, joinRequested: true, trials: true };

const roleWeights: Record<string, number> = {
  'joinRequested': 1,
  'trial': 2,
  'admin': 3,
  'user': 4
};

export const PublicGroupInformationShadcn = () => {

  const { groupId } = useParams();
  const { user } = useGrants();

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useLocalStorageState<Filter>(`filter-${groupId}`, DEFAULT_FILTER, {
    codec: {
      parse: (value): Filter => {
        return JSON.parse(value) as Filter;
      },
      stringify: (value) => JSON.stringify(value),
    },
  });

  const { data: group = null, error, isLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: group_users = [], isLoading: usersLoading, refetch } = useGroupAllUsers(groupId);

  const addUsersMutation = useAddUsersMutation(group);
  const removeUsersMutation = useRemoveUsersMutation(group);
  const leaveGroupMutation = useLeaveGroupMutation();
  const changeUserRoleMutation = useChangeUserRoleMutation();

  const handleUsersAdded = async (users: User[]) => {
    addUsersMutation.mutate(
      { newUsers: users },
      {
        onSuccess: () => {
          toast.success(`Successfully added ${users.length} users to the group ${group?.name}`);
          setSelectedUsers([]);
        },
        onError: (error) => {
          toast.error(`Failed to add ${users.length} user to the group ${group?.name} ${error.message}`);
          captureException(error);
          setSelectedUsers([]);
        },
      }
    );
  };

  const handleUsersRemove = async (users: User[]) => {
    removeUsersMutation.mutate(
      { users },
      {
        onSuccess: () => {
          toast.success(`Successfully removed ${users.length} users from the group ${group?.name}`);
          setSelectedUsers([]);
        },
        onError: (error) => {
          toast.error(`Failed to remove ${users.length} user from the group ${group?.name} ${error.message}`);
          captureException(error);
          setSelectedUsers([]);
        },
      }
    );
  };

  if (!group) {
    if (!isLoading) {
      return <Navigate to={'/groups/list'} />;
    }
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppBar
          className='!border-b !shadow-sm'
          title={'Lade Gruppe...'}
          primaryAction="back"
          user={user}
        />
        <main className='flex-1 overflow-y-auto'>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppBar
        className='!border-b !shadow-sm'
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        primaryAction="back"
        user={user}
      />
      <main className='flex-1 overflow-y-auto'>
        <PullToRefresh onRefresh={() => { refetch(); refetchGroup(); }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div key={"info"} className="gap-2 flex w-full max-w-lg flex-col">
              <div className="text-sm font-semibold">
                Beschreibung
              </div>
              <div className="text-sm text-muted-background">
                {group.description || "Keine Beschreibung vorhanden."}
              </div>
            </div>
            <Separator className="my-2" />
            {
              group.user_group_role === "admin" && <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle variant="outline" aria-label="Toggle italic"
                    pressed={filter?.joinRequested}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), joinRequested: !filter?.joinRequested })}>
                    <GitPullRequest />
                    Anfragen
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle bold"
                    pressed={filter?.trials}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), trials: !filter?.trials })}>
                    <Shapes />
                    Trials
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle bold"
                    pressed={filter?.admin}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), admin: !filter?.admin })}>
                    <UserStar />
                    Admins
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle bold"
                    pressed={filter?.user}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), user: !filter?.user })}>
                    <User />
                    Benutzer
                  </Toggle>
                </div>
              </div>
            }
            {
              Object.entries(groupBy(group_users, (x) => x.role))
                .sort(([roleA], [roleB]) => roleWeights[roleA] - roleWeights[roleB])
                .map(([role, users]) => (
                  <div key={role} className={cn("gap-2 flex w-full max-w-lg flex-col ", {
                    hidden: (role === 'admin' && !filter?.admin) ||
                      (role === 'user' && !filter?.user) ||
                      (role === 'joinRequested' && (group.user_group_role !== "admin" || !filter?.joinRequested)) ||
                      (role === 'trial' && !filter?.trials)
                  })}>
                    <div className="text-sm font-semibold">
                      {role === 'admin' ? 'Admins' : role === 'user' ? 'Mitglieder' : role === 'joinRequested' ? 'Anfrage zum Beitritt' : 'Trial'}
                      {` (${users.length})`}
                    </div>
                    {users
                      .filter((x) => x.user.name.toLowerCase().includes(searchQuery.toLowerCase())
                        || x.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((x) => (
                        <div key={x.user.id} className="flex items-center justify-between rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={x.user.avatarUrl || undefined} alt={x.user.name || undefined} />
                              <AvatarFallback>{x.user.name ? x.user.name[0] : 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div>{x.user.name}</div>
                              <div className="text-xs text-muted-foreground">{x.user.email}</div>
                            </div>
                          </div>
                          {
                            x.role === 'admin' && (
                              <Badge variant="outline" className="text-green-500">Admin</Badge>
                            )
                          }
                          {
                            role === "trial" && (
                              <Button variant={"ghost"} size={"icon-lg"} onClick={() => {

                              }}>
                                <CircleFadingArrowUp />
                              </Button>
                            )
                          }
                          {
                            role === "joinRequested" && (
                              <DropdownMenu >
                                <DropdownMenuTrigger render={<Button variant={"outline"}>Bearbeiten</Button>} />
                                <DropdownMenuContent className={"w-full"}>
                                  <DropdownMenuItem variant="destructive" className={"text-md"}>
                                    <XCircle />
                                    Ablehnen
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className={"text-md"}>
                                    <CheckCircle2 />
                                    Akzeptieren
                                  </DropdownMenuItem>
                                  <Has feat={"events.trials"}>
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className={"text-md"}>
                                        <CheckCircle2 />
                                        Probenutzer akzeptieren
                                      </DropdownMenuItem>
                                    </>
                                  </Has>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )
                          }
                        </div>
                      ))}
                  </div>
                ))
            }
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
}