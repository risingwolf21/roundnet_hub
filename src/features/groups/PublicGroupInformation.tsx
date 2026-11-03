import { PullToRefresh } from "@/components/PullToRefresh";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { useDialogs } from "@/contexts/DialogsProvider";
import { Has } from "@/hooks/useGrants";
import { cn } from "@/lib/utils";
import { useChangeUserRoleMutation, useGroup, useGroupAllUsers, useLeaveGroupMutation } from "@/tanstack/groups";
import { captureException } from "@sentry/react";
import groupBy from "lodash.groupby";
import { AlertCircle, CheckCircle2, CircleFadingArrowUp, GitPullRequest, MoveDownIcon, Pencil, Plus, Shapes, ShieldCheck, User, UserStar, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { v4 } from "uuid";
import { useGrants } from "../auth/GrantsContext";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";
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

// Mirrors the server-side `trial_duration_days` (app_config, default 28). Used only
// for the informational countdown; the authoritative expiry runs in the DB cron job.
const TRIAL_DURATION_DAYS = 28;

const trialDaysLeft = (startedAt: string | null | undefined): number | null => {
  if (!startedAt) return null;
  const elapsedDays = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000);
  return TRIAL_DURATION_DAYS - elapsedDays;
};

const PublicGroupInformation = () => {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // const [filter, setFilter] = useLocalStorageState<Filter>(`filter-${groupId}`, DEFAULT_FILTER, {
  //   codec: {
  //     parse: (value): Filter => {
  //       return JSON.parse(value) as Filter;
  //     },
  //     stringify: (value) => JSON.stringify(value),
  //   },
  // });
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const { data: group = null, error: groupError, isLoading: groupLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: group_users = [], isLoading: usersLoading, error: usersError, refetch } = useGroupAllUsers(groupId);

  const groupedUsers = useMemo(
    () => Object.entries(groupBy(group_users, (x) => x.role))
      .sort(([roleA], [roleB]) => roleWeights[roleA] - roleWeights[roleB]),
    [group_users]
  );

  const addUsersMutation = useAddUsersMutation(group);
  const removeUsersMutation = useRemoveUsersMutation(group);
  const leaveGroupMutation = useLeaveGroupMutation();
  const changeUserRoleMutation = useChangeUserRoleMutation();

  const handleUsersAdded = async (users: User[]) => {
    addUsersMutation.mutate(
      { newUsers: users },
      {
        onSuccess: () => {
          toast.success(t('groups.usersAdded', { count: users.length, group: group?.name }));
          setSelectedUsers([]);
        },
        onError: (error) => {
          toast.error(t('groups.usersAddError', { group: group?.name, error: error.message }));
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
          toast.success(t('groups.usersRemoved', { count: users.length, group: group?.name }));
          setSelectedUsers([]);
        },
        onError: (error) => {
          toast.error(t('groups.usersRemoveError', { group: group?.name, error: error.message }));
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
              <div key={v4()} className="flex items-center justify-between rounded-md border p-2">
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
          title={t('groups.group')}
          primaryAction="back"
          user={user}
        />
        <div className='flex-1 flex items-center justify-center p-4'>
          <Empty>
            <EmptyMedia>
              <AlertCircle className="size-10 text-destructive" />
            </EmptyMedia>
            <EmptyTitle>{t('groups.notFound')}</EmptyTitle>
            <EmptyDescription>
              {t('groups.notFoundDescription')}
            </EmptyDescription>
            <Button onClick={() => navigate('/groups/list')} className="mt-4" variant="outline">
              {t('groups.backToOverview')}
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
            const result = await dialogs.open(CreateOrUpdateGroupDialog, { user, group: group ?? undefined });
            if (result && result !== 'closed') {
              refetch();
              toast.success(t('groups.editSuccess'));
            } else if (!result) {
              toast.error(t('groups.editError'));
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
                {t('costs.description')}
              </div>
              <div className="text-sm text-muted-foreground">
                {group.description || t('groups.noDescription')}
              </div>
            </div>
            <Separator className="my-2" />
            {
              group.user_group_role === "admin" && <div className="space-y-2">
                <div className="text-sm font-semibold">
                  {t('common.filter')}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle variant="outline" aria-label={t('groups.toggleRequests')}
                    pressed={filter?.joinRequested}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), joinRequested: !filter?.joinRequested })}>
                    <GitPullRequest className="size-4" />
                    {t('groups.requests')}
                  </Toggle>
                  <Toggle variant="outline" aria-label={t('groups.toggleTrials')}
                    pressed={filter?.trials}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), trials: !filter?.trials })}>
                    <Shapes className="size-4" />
                    {t('groups.trials')}
                  </Toggle>
                  <Toggle variant="outline" aria-label={t('groups.toggleAdmins')}
                    pressed={filter?.admin}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), admin: !filter?.admin })}>
                    <UserStar className="size-4" />
                    {t('groups.admins')}
                  </Toggle>
                  <Toggle variant="outline" aria-label={t('groups.toggleUsers')}
                    pressed={filter?.user}
                    onPressedChange={() => setFilter({ ...(filter ?? DEFAULT_FILTER), user: !filter?.user })}>
                    <User className="size-4" />
                    {t('browse.user')}
                  </Toggle>
                </div>
              </div>
            }
            {
              selectedUsers.length > 0 && group?.user_group_role === 'admin' && <Alert className="my-4" variant={"error"}>
                <AlertCircle className="size-4" />
                <AlertTitle>{t('groups.removeSelectedTitle')}</AlertTitle>
                <AlertAction>
                  <Button variant={"outline"} onClick={() => {
                    dialogs.confirm(t('groups.removeSelectedConfirm', { count: selectedUsers.length }), {
                      okText: t('groups.remove'),
                      cancelText: t('common.cancel')
                    }).then((result) => {
                      if (result) {
                        handleUsersRemove(selectedUsers);
                      }
                    })
                  }}>{t('groups.remove')}</Button>
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
                  <EmptyTitle>{t('groups.error')}</EmptyTitle>
                  <EmptyDescription>{t('groups.usersLoadError')}</EmptyDescription>
                </Empty>
              </div>
            ) : (
              groupedUsers.map(([role, users]) => (
                <div key={role} className={cn("gap-2 flex w-full flex-col mt-4", {
                  hidden: (role === 'admin' && !filter?.admin) ||
                    (role === 'user' && !filter?.user) ||
                    (role === 'joinRequested' && (group.user_group_role !== "admin" || !filter?.joinRequested)) ||
                    (role === 'trial' && !filter?.trials)
                })}>
                  <div className="text-sm font-semibold">
                    {role === 'admin' ? t('groups.admins') : role === 'user' ? t('groups.members') : role === 'joinRequested' ? t('groups.joinRequest') : t('groups.trial')}
                    {` (${users.length})`}
                  </div>
                  {users
                    .filter((x) => x.user.name.toLowerCase().includes(searchQuery.toLowerCase())
                      || x.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.user.name.localeCompare(b.user.name))
                    .map((x) => (
                      <Item variant={"outline"} key={x.user.id} className="flex items-center justify-between rounded-md border p-2">
                        <ItemMedia>
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
                        </ItemMedia>
                        <ItemContent onClick={() => dialogs.userProfile(x.user.id)}>
                          <ItemTitle>{x.user.name}</ItemTitle>
                          <ItemDescription>
                            {x.user.email}
                            {x.user.last_seen_at && (
                              <span className="ml-2 text-xs">
                                · {t('user.lastActive', { date: new Date(x.user.last_seen_at) })}
                              </span>
                            )}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {
                            x.role === 'admin' && (
                              <>
                                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">{t('groups.admin')}</Badge>
                                <Button
                                  variant="outline"
                                  className={cn("ml-2", {
                                    "hidden": group.user_group_role !== "admin"
                                  })}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const result = await dialogs.confirm(
                                      t('groups.confirmDemote', { name: x.user.name }),
                                      {
                                        okText: t('common.confirm'),
                                        cancelText: t('common.cancel'),
                                      }
                                    );
                                    if (result) {
                                      changeUserRoleMutation.mutate({ group: group, user: x.user, new_role: 'user' });
                                    }
                                  }}
                                >
                                  <MoveDownIcon />
                                </Button>
                              </>
                            )
                          }
                          {
                            role === "trial" && (() => {
                              const daysLeft = trialDaysLeft(x.trial_started_at);
                              if (daysLeft === null) return null;
                              return (
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", daysLeft <= 3
                                    ? "text-destructive border-destructive/20 bg-destructive/10"
                                    : "text-muted-foreground")}
                                >
                                  {daysLeft > 0
                                    ? t('groups.trialDaysLeft', { count: daysLeft })
                                    : t('groups.trialExpiring')}
                                </Badge>
                              );
                            })()
                          }
                          {
                            role === "user" && <div className={cn("flex items-center gap-2", {
                              "hidden": group.user_group_role !== "admin"
                            })}>
                              <Button
                                variant="outline"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const result = await dialogs.confirm(
                                    t('groups.confirmPromote', { name: x.user.name }),
                                    {
                                      okText: t('common.confirm'),
                                      cancelText: t('common.cancel'),
                                    }
                                  );
                                  if (result) {
                                    changeUserRoleMutation.mutate({ group: group, user: x.user, new_role: 'admin' });
                                  }
                                }}
                              >
                                <ShieldCheck />
                              </Button>
                              <Has feat={'events.trials'}>
                                <Button
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const result = await dialogs.confirm(
                                      t('groups.confirmTrial', { name: x.user.name }),
                                      {
                                        okText: t('common.confirm'),
                                        cancelText: t('common.cancel'),
                                      }
                                    );
                                    if (result) {
                                      changeUserRoleMutation.mutate({ group: group, user: x.user, new_role: 'trial' });
                                    }
                                  }}
                                >
                                  <MoveDownIcon />
                                </Button>
                              </Has>
                            </div>
                          }
                          {
                            role === "trial" && group.user_group_role === "admin" && <AcceptTrialButton group={group} user={x.user} />
                          }
                          {
                            role === "joinRequested" && group.user_group_role === "admin" && <RequestedGroupJoinButton group={group} user={x.user} />
                          }
                        </ItemActions>
                      </Item>
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
  const { t } = useTranslation();
  const changeUserRoleMutation = useChangeUserRoleMutation();
  const dialogs = useDialogs();
  return <Button variant={"ghost"} size={"icon-sm"} onClick={() => {
    dialogs.confirm(t('groups.confirmAcceptTrial'), {
      okText: t('groups.accept'),
      cancelText: t('common.cancel')
    }).then((result) => {
      if (result) {
        changeUserRoleMutation.mutate(
          { user: user, group: group, new_role: 'user' },
          {
            onError: (error) => {
              toast.error(t('groups.requestAcceptError', { error: error.message }));
            },
            onSuccess: () => {
              toast.success(t('groups.requestAccepted'));
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
  const { t } = useTranslation();
  const declineJoinMutation = useDeclineRequestMutation(group);
  const changeUserRoleMutation = useChangeUserRoleMutation();
  const dialogs = useDialogs();

  return <DropdownMenu >
    <DropdownMenuTrigger render={<Button variant={"outline"} size="sm">{t('groups.manageRequest')}</Button>} />
    <DropdownMenuContent className={"w-full"}>
      <DropdownMenuItem variant="destructive" className={"text-sm"}
        onClick={() =>
          dialogs.confirm(t('groups.confirmDecline'), {
            okText: t('groups.decline'),
            cancelText: t('common.cancel')
          }).then((result) => {
            if (result) {
              declineJoinMutation.mutate(user, {
                onError: (error) => {
                  toast.error(t('groups.requestDeclineError', { error: error.message }));
                },
                onSuccess: () => {
                  toast.success(t('groups.requestDeclined'));
                },
              })
            }
          })
        }>
        <XCircle className="size-4 mr-2" />
        {t('groups.decline')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className={"text-sm"}
        onClick={() => {
          dialogs.confirm(t('groups.confirmAcceptRequest'), {
            okText: t('groups.accept'),
            cancelText: t('common.cancel')
          }).then((result) => {
            if (result) {
              changeUserRoleMutation.mutate(
                { user: user, group: group, new_role: 'user' },
                {
                  onError: (error) => {
                    toast.error(t('groups.requestAcceptError', { error: error.message }));
                  },
                  onSuccess: () => {
                    toast.success(t('groups.requestAccepted'));
                  },
                }
              );
            }
          })
        }}>
        <CheckCircle2 className="size-4 mr-2" />
        {t('groups.accept')}
      </DropdownMenuItem>
      <Has feat={"events.trials"}>
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={"text-sm"}
            onClick={() => {
              dialogs.confirm(t('groups.confirmAcceptTrialUser'), {
                okText: t('groups.accept'),
                cancelText: t('common.cancel')
              }).then((result) => {
                if (result) {
                  changeUserRoleMutation.mutate(
                    { user: user, group: group, new_role: 'trial' },
                    {
                      onError: (error) => {
                        toast.error(t('groups.requestAcceptError', { error: error.message }));
                      },
                      onSuccess: () => {
                        toast.success(t('groups.requestAccepted'));
                      },
                    }
                  );
                }
              })
            }}>
            <CheckCircle2 className="size-4 mr-2" />
            {t('groups.trialUser')}
          </DropdownMenuItem>
        </>
      </Has>
    </DropdownMenuContent>
  </DropdownMenu>
}

export default PublicGroupInformation;