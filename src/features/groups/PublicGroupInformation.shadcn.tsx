import { PullToRefresh } from "@/components/PullToRefresh";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { useDialogs } from "@/contexts/DialogsProvider";
import { Has } from "@/hooks/useGrants";
import { cn } from "@/lib/utils";
import { useChangeUserRoleMutation, useGroup, useGroupAllUsers, useLeaveGroupMutation } from "@/tanstack/groups";
import { captureException } from "@sentry/react";
import { useLocalStorageState } from "@toolpad/core";
import groupBy from "lodash.groupby";
import { AlertCircle, CheckCircle2, CircleFadingArrowUp, GitPullRequest, Pencil, Plus, Shapes, User, UserStar, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { CreateOrUpdateGroupDialogShadcn } from "./dialogs/CreateOrUpdateGroupDialog.shadcn";
import { useAddUsersMutation } from "./query/addUsersMutation";
import { useDeclineRequestMutation } from "./query/declineRequestMutation";
import { useRemoveUsersMutation } from "./query/removeUsersMutation";

type Filter = { user: boolean; admin: boolean; joinRequested: boolean; trials: boolean };
const DEFAULT_FILTER = { user: true, admin: true, joinRequested: true, trials: true };

const roleWeights: Record<string, number> = {
  'joinRequested': 1,
  'trial': 2,
  'admin': 3,
  'user': 4
};

const PublicGroupInformationShadcn = () => {

  const { groupId } = useParams();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

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

  const { data: group = null, error: groupError, isLoading: groupLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: group_users = [], isLoading: usersLoading, error: usersError, refetch } = useGroupAllUsers(groupId);

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

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AppBar
          className='!border-b !shadow-sm'
          title={""}
          primaryAction="back"
          user={user}
        />
        <div className='flex-1 p-4 space-y-4'>
          {/* Beschreibung Skeleton */}
          <div className="space-y-2 max-w-lg">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Separator />
          {/* Filter Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-12" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>
          {/* Users List Skeleton */}
          <div className="space-y-4 mt-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AppBar
          className='!border-b !shadow-sm'
          title="Gruppe"
          primaryAction="back"
          user={user}
        />
        <div className='flex-1 flex items-center justify-center p-4'>
          <Empty>
            <EmptyMedia>
              <AlertCircle className="size-10 text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Gruppe nicht gefunden</EmptyTitle>
            <EmptyDescription>
              Die angeforderte Gruppe existiert nicht, wurde gelöscht oder du hast keine Zugriffsberechtigung.
            </EmptyDescription>
            <Button onClick={() => navigate('/groups/list')} className="mt-4" variant="outline">
              Zurück zur Übersicht
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppBar
        className='!border-b !shadow-sm'
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        primaryAction="back"
        user={user}
        actions={
          <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
            const result = await dialogs.open(CreateOrUpdateGroupDialogShadcn, { user, group: group ?? undefined });
            if (result && result !== 'closed') {
              refetch();
              toast.success('Gruppe wurde erfolgreich bearbeitet.');
            } else if (!result) {
              toast.error('Gruppe konnte nicht bearbeitet werden.');
            }
          }}>
            <Pencil />
          </Button>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom overflow-y-auto'>
        <PullToRefresh onRefresh={() => { refetch(); refetchGroup(); }}>
          <div className="flex-1 p-4 space-y-2">
            <div key={"info"} className="gap-2 flex w-full max-w-lg flex-col">
              <div className="text-lg font-semibold">{group.name}</div>
              <div className="text-sm font-semibold">
                Beschreibung
              </div>
              <div className="text-sm text-muted-foreground">
                {group.description || "Keine Beschreibung vorhanden."}
              </div>
            </div>
            <Separator className="my-2" />
            {
              group.user_group_role === "admin" && <div className="space-y-2">
                <div className="text-sm font-semibold">
                  Filter
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle variant="outline" aria-label="Toggle join requests"
                    pressed={filter?.joinRequested}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), joinRequested: !filter?.joinRequested })}>
                    <GitPullRequest className="size-4" />
                    Anfragen
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle trials"
                    pressed={filter?.trials}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), trials: !filter?.trials })}>
                    <Shapes className="size-4" />
                    Trials
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle admins"
                    pressed={filter?.admin}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), admin: !filter?.admin })}>
                    <UserStar className="size-4" />
                    Admins
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle users"
                    pressed={filter?.user}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), user: !filter?.user })}>
                    <User className="size-4" />
                    Benutzer
                  </Toggle>
                </div>
              </div>
            }
            {
              selectedUsers.length > 0 && group?.user_group_role === 'admin' && <Alert className="my-4" variant={"error"}>
                <AlertCircle className="size-4" />
                <AlertTitle>Gewählte Benutzer aus der Gruppe entfernen?</AlertTitle>
                <AlertAction>
                  <Button variant={"outline"} onClick={() => {
                    dialogs.confirm(`Möchtest du die ${selectedUsers.length} ausgewählten Benutzer wirklich aus der Gruppe entfernen?`, {
                      okText: "Entfernen",
                      cancelText: "Abbrechen"
                    }).then((result) => {
                      if (result) {
                        handleUsersRemove(selectedUsers);
                      }
                    })
                  }}>Entfernen</Button>
                </AlertAction>
              </Alert>
            }

            {usersLoading ? (
              <div className="space-y-4 mt-6">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 3 }).map((_, i) => i).map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : usersError ? (
              <div className="mt-8">
                <Empty>
                  <EmptyMedia>
                    <AlertCircle className="size-8 text-destructive" />
                  </EmptyMedia>
                  <EmptyTitle>Fehler</EmptyTitle>
                  <EmptyDescription>Benutzer konnten nicht geladen werden.</EmptyDescription>
                </Empty>
              </div>
            ) : (
              Object.entries(groupBy(group_users, (x) => x.role))
                .sort(([roleA], [roleB]) => roleWeights[roleA] - roleWeights[roleB])
                .map(([role, users]) => (
                  <div key={role} className={cn("gap-2 flex w-full flex-col mt-4", {
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
                            <Avatar className="cursor-pointer" {...(
                              (role === "admin" || role === "trial" || role === "user" && group.user_group_role === "admin") && {
                                onClick: () => {
                                  if (selectedUsers.includes(x.user)) {
                                    setSelectedUsers([...selectedUsers.filter((y) => y.id !== x.user.id)]);
                                  } else {
                                    setSelectedUsers([...selectedUsers, x.user]);
                                  }
                                }
                              }
                            )}>
                              {
                                selectedUsers.includes(x.user)
                                  ? <div className="flex items-center justify-center size-full bg-primary/10 text-primary rounded-full">
                                    <CheckCircle2 className="size-6" />
                                  </div>
                                  : <>
                                    <AvatarImage src={x.user.avatarUrl || undefined} alt={x.user.name || undefined} />
                                    <AvatarFallback>{x.user.name ? x.user.name[0] : 'U'}</AvatarFallback>
                                  </>
                              }
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{x.user.name}</div>
                              <div className="text-xs text-muted-foreground">{x.user.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {
                              x.role === 'admin' && (
                                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">Admin</Badge>
                              )
                            }
                            {
                              role === "trial" && <AcceptTrialButton group={group} user={x.user} />
                            }
                            {
                              role === "joinRequested" && <RequestedGroupJoinButton group={group} user={x.user} />
                            }
                          </div>
                        </div>
                      ))}
                  </div>
                ))
            )}
          </div>
        </PullToRefresh>
        {group.user_group_role === "admin" && (
          <div
            className="fixed right-6 z-50"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
              onClick={() => {
                dialogs
                  .selectMultipleUser(group_users.map((x) => x.user.id))
                  .then((result) => {
                    if (result) handleUsersAdded(result);
                  });
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

const AcceptTrialButton = ({ group, user }: { group: Group; user: User }) => {
  const changeUserRoleMutation = useChangeUserRoleMutation();
  const dialogs = useDialogs();
  return <Button variant={"ghost"} size={"icon-sm"} onClick={() => {
    dialogs.confirm("Möchtest du den Benutzer wirklich als regulären Benutzer akzeptieren?", {
      okText: "Akzeptieren",
      cancelText: "Abbrechen"
    }).then((result) => {
      if (result) {
        changeUserRoleMutation.mutate(
          { user: user, group: group, new_role: 'user' },
          {
            onError: (error) => {
              toast.error('Anfrage konnte nicht akzeptiert werden. ' + error.message);
            },
            onSuccess: () => {
              toast.success('Anfrage erfolgreich akzeptiert.');
            },
          }
        );
      }
    })
  }}>
    <CircleFadingArrowUp className="size-4" />
  </Button>
}

const RequestedGroupJoinButton = ({ group, user }: { group: Group; user: User }) => {
  const declineJoinMutation = useDeclineRequestMutation(group);
  const changeUserRoleMutation = useChangeUserRoleMutation();
  const dialogs = useDialogs();

  return <DropdownMenu >
    <DropdownMenuTrigger render={<Button variant={"outline"} size="sm">Bearbeiten</Button>} />
    <DropdownMenuContent className={"w-full"}>
      <DropdownMenuItem variant="destructive" className={"text-sm"}
        onClick={() =>
          dialogs.confirm("Möchtest du die Beitrittsanfrage wirklich ablehnen?", {
            okText: "Ablehnen",
            cancelText: "Abbrechen"
          }).then((result) => {
            if (result) {
              declineJoinMutation.mutate(user, {
                onError: (error) => {
                  toast.error('Anfrage konnte nicht gelöscht werden. ' + error.message);
                },
                onSuccess: () => {
                  toast.success('Anfrage erfolgreich gelöscht.');
                },
              })
            }
          })
        }>
        <XCircle className="size-4 mr-2" />
        Ablehnen
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className={"text-sm"}
        onClick={() => {
          dialogs.confirm("Möchtest du die Beitrittsanfrage wirklich akzeptieren?", {
            okText: "Akzeptieren",
            cancelText: "Abbrechen"
          }).then((result) => {
            if (result) {
              changeUserRoleMutation.mutate(
                { user: user, group: group, new_role: 'user' },
                {
                  onError: (error) => {
                    toast.error('Anfrage konnte nicht akzeptiert werden. ' + error.message);
                  },
                  onSuccess: () => {
                    toast.success('Anfrage erfolgreich akzeptiert.');
                  },
                }
              );
            }
          })
        }}>
        <CheckCircle2 className="size-4 mr-2" />
        Akzeptieren
      </DropdownMenuItem>
      <Has feat={"events.trials"}>
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={"text-sm"}
            onClick={() => {
              dialogs.confirm("Möchtest du den Benutzer wirklich als Probenutzer akzeptieren?", {
                okText: "Akzeptieren",
                cancelText: "Abbrechen"
              }).then((result) => {
                if (result) {
                  changeUserRoleMutation.mutate(
                    { user: user, group: group, new_role: 'trial' },
                    {
                      onError: (error) => {
                        toast.error('Anfrage konnte nicht akzeptiert werden. ' + error.message);
                      },
                      onSuccess: () => {
                        toast.success('Anfrage erfolgreich akzeptiert.');
                      },
                    }
                  );
                }
              })
            }}>
            <CheckCircle2 className="size-4 mr-2" />
            Probenutzer
          </DropdownMenuItem>
        </>
      </Has>
    </DropdownMenuContent>
  </DropdownMenu>
}

export default PublicGroupInformationShadcn;