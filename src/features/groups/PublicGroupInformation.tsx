import { DangerZone } from "@/components/DangerZone";
import { groupSideBar, ListError, ListSkeleton, SegmentedControl } from "@/components/list/ListParts";
import { PullToRefresh } from "@/components/PullToRefresh";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialogs } from "@/contexts/DialogsProvider";
import { Has } from "@/hooks/useGrants";
import { cn } from "@/lib/utils";
import { useChangeUserRoleMutation, useGroup, useGroupAllUsers, useGroups, useJoinGroup, useLeaveGroupMutation } from "@/tanstack/groups";
import { captureException } from "@sentry/react";
import { AlertCircle, CheckCircle2, CircleFadingArrowUp, EyeOff, Lock, LogOut, MoreVertical, Pencil, Plus, Search, ShieldCheck, ShieldOff, UserMinus, UserPlus, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";
import { useAddUsersMutation } from "./query/addUsersMutation";
import { useDeclineRequestMutation } from "./query/declineRequestMutation";
import { useRemoveUsersMutation } from "./query/removeUsersMutation";

type MemberView = "all" | "admin" | "user" | "trial" | "joinRequested";

// Mirrors the server-side `trial_duration_days` (app_config, default 28). Used only
// for the informational countdown; the authoritative expiry runs in the DB cron job.
const TRIAL_DURATION_DAYS = 28;
const SEARCH_THRESHOLD = 8;

const trialDaysLeft = (startedAt: string | null | undefined, now: number): number | null => {
  if (!startedAt) return null;
  const elapsedDays = Math.floor((now - new Date(startedAt).getTime()) / 86_400_000);
  return TRIAL_DURATION_DAYS - elapsedDays;
};

const JoinButton = ({ group, user }: { group: Group; user: User }) => {
  const { t } = useTranslation();
  const { refetchUserGrants } = useGrants();
  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user");

  return (
    <Button
      className="w-full"
      disabled={joinGroup.isPending}
      onClick={() =>
        joinGroup.mutate(undefined, {
          onError: (e) => {
            captureException(e);
            toast.error(t("groups.joinError"));
          },
          onSuccess: () => refetchUserGrants(),
        })
      }
    >
      <UserPlus className="size-4" />
      {joinGroup.isPending ? t("groups.joining") : group.need_request_to_join ? t("groups.requestToJoin") : t("groups.join")}
    </Button>
  );
};

const PublicGroupInformation = () => {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const { user, hasPerm, refetchUserGrants } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const [view, setView] = useState<MemberView>("all");
  const [selecting, setSelecting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => Date.now());

  const { data: group = null, error: groupError, isLoading: groupLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: group_users = [], isLoading: usersLoading, error: usersError, refetch } = useGroupAllUsers(groupId);
  const { data: allGroups = [] } = useGroups();

  const addUsersMutation = useAddUsersMutation(group);
  const removeUsersMutation = useRemoveUsersMutation(group);
  const leaveGroupMutation = useLeaveGroupMutation();
  const changeUserRoleMutation = useChangeUserRoleMutation();

  const myRole = group?.user_group_role ?? null;
  const isGroupAdmin = myRole === "admin";
  // Mirrors the row-level policies: group admins and platform admins manage members and the group itself.
  const canManage = isGroupAdmin || hasPerm("supabase.admin");
  const isMember = myRole === "admin" || myRole === "user" || myRole === "trial";
  const canSeeMembers = isMember || hasPerm("supabase.admin");

  const byRole = useMemo(() => {
    const roles: Record<MemberView, typeof group_users> = { all: [], admin: [], user: [], trial: [], joinRequested: [] };
    for (const x of group_users) {
      if (x.role in roles) roles[x.role as MemberView].push(x);
    }
    roles.all = [...roles.admin, ...roles.user, ...roles.trial];
    return roles;
  }, [group_users]);

  const query = searchQuery.trim().toLowerCase();
  const matches = (x: (typeof group_users)[number]) =>
    !query || x.user.name.toLowerCase().includes(query) || (canManage && x.user.email.toLowerCase().includes(query));

  const visibleSections: { role: Exclude<MemberView, "all">; title: string }[] = (
    [
      { role: "joinRequested", title: t("groups.joinRequest") },
      { role: "admin", title: t("groups.admins") },
      { role: "user", title: t("groups.members") },
      { role: "trial", title: t("groups.trial") },
    ] as const
  ).filter((s) => (view === "all" ? s.role !== "joinRequested" : view === s.role));

  const viewOptions = [
    { value: "all" as const, label: t("groups.viewAll"), count: byRole.all.length },
    { value: "admin" as const, label: t("groups.admins"), count: byRole.admin.length },
    { value: "user" as const, label: t("groups.members"), count: byRole.user.length },
    ...(byRole.trial.length > 0 ? [{ value: "trial" as const, label: t("groups.trials"), count: byRole.trial.length }] : []),
    ...(canManage && byRole.joinRequested.length > 0
      ? [{ value: "joinRequested" as const, label: t("groups.requestsTab"), count: byRole.joinRequested.length }]
      : []),
  ];

  const showSearch = group_users.length > SEARCH_THRESHOLD;

  const parentName = group?.parent_group ? allGroups.find((x) => x.id === group.parent_group)?.name : undefined;

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedUsers([]);
  };

  const handleUsersAdded = (users: User[]) => {
    addUsersMutation.mutate(
      { newUsers: users },
      {
        onSuccess: () => toast.success(t("groups.usersAdded", { count: users.length, group: group?.name })),
        onError: (error) => {
          toast.error(t("groups.usersAddError", { group: group?.name, error: error.message }));
          captureException(error);
        },
      }
    );
  };

  const handleUsersRemove = (users: User[]) => {
    removeUsersMutation.mutate(
      { users },
      {
        onSuccess: () => {
          toast.success(t("groups.usersRemoved", { count: users.length, group: group?.name }));
          stopSelecting();
        },
        onError: (error) => {
          toast.error(t("groups.usersRemoveError", { group: group?.name, error: error.message }));
          captureException(error);
        },
      }
    );
  };

  const changeRole = async (target: User, newRole: GroupRole, confirmMessage: string) => {
    if (!group) return;
    if (!(await dialogs.confirm(confirmMessage, { okText: t("common.confirm"), cancelText: t("common.cancel") }))) return;
    changeUserRoleMutation.mutate(
      { group, user: target, new_role: newRole },
      {
        onSuccess: () => toast.success(t("groups.roleChanged")),
        onError: (error) => {
          captureException(error);
          toast.error(t("groups.roleChangeError", { error: error.message }));
        },
      }
    );
  };

  const removeOne = async (target: User) => {
    if (await dialogs.confirm(t("groups.confirmRemove", { name: target.name }), { okText: t("groups.remove"), cancelText: t("common.cancel") })) {
      handleUsersRemove([target]);
    }
  };

  const leaveGroup = async () => {
    if (!group) return;
    if (!(await dialogs.confirm(t("groups.leaveConfirm", { group: group.name }), { okText: t("groups.leave"), cancelText: t("common.cancel") }))) return;
    leaveGroupMutation.mutate(
      { group, user },
      {
        onSuccess: () => {
          toast.success(t("groups.left", { group: group.name }));
          refetchUserGrants();
          navigate("/groups/list", { replace: true });
        },
        onError: (error) => {
          captureException(error);
          toast.error(t("groups.leaveError", { error: error.message }));
        },
      }
    );
  };

  const editGroup = async () => {
    if (!group) return;
    const result = await dialogs.open(CreateOrUpdateGroupDialog, { user, group });
    if (result && result !== "closed") {
      refetch();
      refetchGroup();
      toast.success(t("groups.editSuccess"));
    } else if (!result) {
      toast.error(t("groups.editError"));
    }
  };

  if (groupLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppBar className="!border-b !shadow-sm" title="" primaryAction="back" user={user} />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <ListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppBar className="!border-b !shadow-sm" title={t("groups.group")} primaryAction="back" user={user} />
        <Empty className="mt-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>{t("groups.notFound")}</EmptyTitle>
            <EmptyDescription>{t("groups.notFoundDescription")}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => navigate("/groups/list")} variant="outline">
            {t("groups.backToOverview")}
          </Button>
        </Empty>
      </div>
    );
  }

  const onlyAdmin = isGroupAdmin && byRole.admin.length <= 1;

  const renderMember = (x: (typeof group_users)[number], role: Exclude<MemberView, "all">) => {
    const self = x.user.id === user.id;
    const selected = selectedUsers.some((y) => y.id === x.user.id);
    const selectable = selecting && canManage && !self && role !== "joinRequested";
    const daysLeft = role === "trial" ? trialDaysLeft(x.trial_started_at, now) : null;

    return (
      <Item
        key={x.user.id}
        variant="outline"
        className={cn(selected && "border-primary/50 bg-primary/5")}
        onClick={() => {
          if (selectable) {
            setSelectedUsers(selected ? selectedUsers.filter((y) => y.id !== x.user.id) : [...selectedUsers, x.user]);
          } else if (!selecting) {
            dialogs.userProfile(x.user.id);
          }
        }}
      >
        <ItemMedia>
          <Avatar>
            {selected ? (
              <div className="flex size-full items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-6" />
              </div>
            ) : (
              <>
                <AvatarImage src={x.user.avatarUrl || undefined} alt={x.user.name || undefined} />
                <AvatarFallback>{x.user.name ? x.user.name[0] : "U"}</AvatarFallback>
              </>
            )}
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="min-w-0">
            <span className="truncate">{x.user.name}</span>
            {self && <Badge variant="secondary">{t("groups.you")}</Badge>}
          </ItemTitle>
          {canManage && (
            <ItemDescription className="truncate">
              {x.user.email}
              {x.user.last_seen_at && <span className="text-xs"> · {t("user.lastActive", { date: new Date(x.user.last_seen_at) })}</span>}
            </ItemDescription>
          )}
          {(role === "admin" || role === "trial") && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {role === "admin" && (
                <Badge variant="info">
                  <ShieldCheck />
                  {t("groups.admin")}
                </Badge>
              )}
              {role === "trial" && <Badge variant="secondary">{t("groups.trial")}</Badge>}
              {daysLeft !== null && (
                <Badge variant={daysLeft <= 3 ? "warning" : "outline"}>
                  {daysLeft > 0 ? t("groups.trialDaysLeft", { count: daysLeft }) : t("groups.trialExpiring")}
                </Badge>
              )}
            </div>
          )}
        </ItemContent>
        {canManage && !selecting && !self && (
          <ItemActions onClick={(e) => e.stopPropagation()}>
            {role === "joinRequested" ? (
              <RequestedGroupJoinButton group={group} user={x.user} />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-lg" aria-label={t("groups.memberActions", { name: x.user.name })}>
                      <MoreVertical />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {role === "admin" && (
                    <DropdownMenuItem onClick={() => changeRole(x.user, "user", t("groups.confirmDemote", { name: x.user.name }))}>
                      <ShieldOff className="size-4" />
                      {t("groups.removeAdmin")}
                    </DropdownMenuItem>
                  )}
                  {role === "user" && (
                    <>
                      <DropdownMenuItem onClick={() => changeRole(x.user, "admin", t("groups.confirmPromote", { name: x.user.name }))}>
                        <ShieldCheck className="size-4" />
                        {t("groups.makeAdmin")}
                      </DropdownMenuItem>
                      <Has feat="events.trials">
                        <DropdownMenuItem onClick={() => changeRole(x.user, "trial", t("groups.confirmTrial", { name: x.user.name }))}>
                          <Users className="size-4" />
                          {t("groups.makeTrial")}
                        </DropdownMenuItem>
                      </Has>
                    </>
                  )}
                  {role === "trial" && (
                    <DropdownMenuItem onClick={() => changeRole(x.user, "user", t("groups.confirmAcceptTrial"))}>
                      <CircleFadingArrowUp className="size-4" />
                      {t("groups.acceptTrialMember")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => removeOne(x.user)}>
                    <UserMinus className="size-4" />
                    {t("groups.remove")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </ItemActions>
        )}
      </Item>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppBar
        className="!border-b !shadow-sm"
        primaryAction="back"
        user={user}
        title={group.name}
        actions={
          canManage && (
            <Button variant="ghost" size="icon-lg" aria-label={t("groups.edit")} onClick={editGroup}>
              <Pencil />
            </Button>
          )
        }
      />
      <main className="size-full flex-1 overflow-y-auto pb-safe-bottom">
        <PullToRefresh
          onRefresh={() => {
            refetch();
            refetchGroup();
          }}
        >
          <div className="flex flex-col gap-3 p-4" style={{ paddingBottom: selecting ? "calc(6rem + env(safe-area-inset-bottom))" : undefined }}>
            <section className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", groupSideBar(group.color).className)} style={groupSideBar(group.color).style}>
              <div className="flex items-start gap-3">
                <Avatar className="size-12 shrink-0 items-center justify-center bg-[color:var(--group-color)]" style={{ "--group-color": group.color } as React.CSSProperties}>
                  <Users className="size-6" style={{ color: "color-mix(in srgb, var(--group-color), white 70%)" }} />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-semibold">{group.name}</h1>
                  <p className="text-sm text-muted-foreground">{group.description || t("groups.noDescription")}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {isGroupAdmin && (
                  <Badge variant="info">
                    <ShieldCheck />
                    {t("groups.admin")}
                  </Badge>
                )}
                {myRole === "trial" && <Badge variant="secondary">{t("groups.trial")}</Badge>}
                {myRole === "joinRequested" && <Badge variant="warning">{t("groups.requested")}</Badge>}
                {parentName && <Badge variant="outline">{t("groups.subgroupOf", { group: parentName })}</Badge>}
                {group.need_request_to_join && (
                  <Badge variant="secondary">
                    <Lock />
                    {t("groups.approvalRequired")}
                  </Badge>
                )}
                {canManage && !group.visible && (
                  <Badge variant="outline">
                    <EyeOff />
                    {t("groups.hidden")}
                  </Badge>
                )}
                {canManage && !group.is_public && (
                  <Badge variant="outline">
                    <Lock />
                    {t("groups.private")}
                  </Badge>
                )}
                {canSeeMembers && (
                  <span className="text-xs text-muted-foreground">{t("groups.memberCount", { count: byRole.all.length })}</span>
                )}
              </div>
              {!myRole && <JoinButton group={group} user={user} />}
              {myRole === "joinRequested" && <p className="text-sm text-muted-foreground">{t("groups.requestedHint")}</p>}
            </section>

            {canManage && byRole.joinRequested.length > 0 && view !== "joinRequested" && (
              <Alert variant="warning">
                <AlertCircle />
                <AlertDescription>{t("groups.openRequestsAlert", { count: byRole.joinRequested.length })}</AlertDescription>
                <AlertAction>
                  <Button variant="outline" size="sm" onClick={() => setView("joinRequested")}>
                    {t("groups.reviewRequests")}
                  </Button>
                </AlertAction>
              </Alert>
            )}

            {canSeeMembers && !usersLoading && !usersError && (
              <div className="flex flex-col gap-2">
                <SegmentedControl
                  ariaLabel={t("groups.members")}
                  value={viewOptions.some((o) => o.value === view) ? view : "all"}
                  onChange={setView}
                  options={viewOptions}
                />
                {(showSearch || canManage) && (
                  <div className="flex items-center gap-2">
                    {showSearch && (
                      <InputGroup className="min-w-0 flex-1">
                        <InputGroupInput
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("common.searchPlaceholder")}
                          aria-label={t("common.searchPlaceholder")}
                          className="rounded-full"
                        />
                        <InputGroupAddon>
                          <Search />
                        </InputGroupAddon>
                      </InputGroup>
                    )}
                    {canManage && (
                      <Button
                        className="ml-auto shrink-0"
                        variant={selecting ? "secondary" : "outline"}
                        onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                      >
                        {selecting ? t("common.cancel") : t("groups.select")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!canSeeMembers && (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t("groups.membersHidden")}</p>
            )}

            {canSeeMembers && usersLoading && <ListSkeleton rows={3} />}

            {canSeeMembers && !usersLoading && usersError && (
              <ListError
                title={t("groups.error")}
                description={t("groups.usersLoadError")}
                retryLabel={t("challenge.list.retry")}
                onRetry={() => refetch()}
              />
            )}

            {canSeeMembers &&
              !usersLoading &&
              !usersError &&
              visibleSections.map(({ role, title }) => {
                const users = byRole[role].filter(matches).sort((a, b) => a.user.name.localeCompare(b.user.name));
                if (users.length === 0) return null;
                return (
                  <section key={role} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>{title}</span>
                      <span className="font-normal">· {users.length}</span>
                    </div>
                    {users.map((x) => renderMember(x, role))}
                  </section>
                );
              })}

            {canSeeMembers && !usersLoading && !usersError && query && visibleSections.every(({ role }) => byRole[role].filter(matches).length === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("groups.noMembersFound")}</p>
            )}

            {isMember && onlyAdmin && (
              <Alert variant="info">
                <ShieldCheck />
                <AlertDescription>{t("groups.lastAdminHint")}</AlertDescription>
              </Alert>
            )}

            {isMember && !onlyAdmin && (
              <DangerZone
                description={t("groups.leaveDescription")}
                actionLabel={t("groups.leave")}
                icon={<LogOut />}
                loading={leaveGroupMutation.isPending}
                onAction={leaveGroup}
              />
            )}
          </div>
        </PullToRefresh>

        {selecting ? (
          <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <span className="text-sm font-medium">{t("groups.selectedCount", { count: selectedUsers.length })}</span>
            <Button
              variant="destructive"
              disabled={selectedUsers.length === 0 || removeUsersMutation.isPending}
              onClick={async () => {
                if (
                  await dialogs.confirm(t("groups.removeSelectedConfirm", { count: selectedUsers.length }), {
                    okText: t("groups.remove"),
                    cancelText: t("common.cancel"),
                  })
                ) {
                  handleUsersRemove(selectedUsers);
                }
              }}
            >
              <UserMinus />
              {t("groups.remove")}
            </Button>
          </div>
        ) : (
          isGroupAdmin && (
            <div className="fixed right-6 z-50" style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
              <Button
                size="icon"
                aria-label={t("groups.addMembers")}
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md"
                onClick={() => dialogs.selectMultipleUser(group_users.map((x) => x.user.id)).then((result) => result && handleUsersAdded(result))}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          )
        )}
      </main>
    </div>
  );
};

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
