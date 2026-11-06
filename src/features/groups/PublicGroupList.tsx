import { ListError, ListSectionHeader, ListSkeleton } from "@/components/list/ListParts";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Alert } from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDialogs } from "@/contexts/DialogsProvider";
import { Has } from "@/hooks/useGrants";
import { queryClient } from "@/lib/queryClient";
import { authKeys } from "@/tanstack/auth";
import { useGroups, useJoinGroup, useRequestedUsersPerGroup } from "@/tanstack/groups";
import { useAllNotifications } from "@/tanstack/notifications";
import { GroupWithUserMappings } from "@/types/supabaseTypes";
import { captureException } from "@sentry/react";
import { Clock, EyeOff, Info, Lock, Plus, SearchX, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";

const SEARCH_THRESHOLD = 8;

const JoinGroupButton = ({ group, user }: { group: Group; user: User }) => {
  const { t } = useTranslation();
  const { refetchUserGrants } = useGrants();
  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user");

  return (
    <Button
      variant="outline"
      disabled={joinGroup.isPending}
      onClick={(event) => {
        joinGroup.mutate(undefined, {
          onError: (e) => {
            captureException(e);
            toast.error(t('groups.joinError'));
          },
          onSuccess: () => {
            refetchUserGrants();
          },
        });
        event.stopPropagation();
      }}
    >
      <UserPlus className="size-4" />
      {joinGroup.isPending ? t('groups.joining') : group.need_request_to_join ? t('groups.requests') : t('groups.join')}
    </Button>
  );
}

const PublicGroupList = () => {

  const { user, hasPerm } = useGrants();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { t } = useTranslation();

  const { data: groups = [], error, isLoading, refetch } = useGroups();
  const { data: requested_group_joins = [], refetch: refetchRequested } = useRequestedUsersPerGroup(user);
  const { data: notifications = [] } = useAllNotifications(user);

  const [joinRequestedGroup, setJoinRequestedGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState('');

  const isPlatformAdmin = hasPerm(['supabase.admin', 'groups.manage.admin'], 'any');

  const hasTrialExpiredFor = (groupId: string) =>
    notifications.some(
      (n) => n.topic === 'group.trial.expired' && (n.data as { group?: string })?.group === groupId
    );

  const pendingRequests = (groupId: string) => requested_group_joins.filter((y) => y.group === groupId).length;

  const parentName = (group: GroupWithUserMappings) =>
    group.parent_group ? groups.find((x) => x.id === group.parent_group)?.name : undefined;

  const query = search.trim().toLowerCase();
  const visibleGroups = groups
    .filter((x) => x.visible || x.user_group_role !== null || isPlatformAdmin)
    .filter((x) => !query || x.name.toLowerCase().includes(query) || x.description?.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  const mine = visibleGroups.filter((x) => x.user_group_role === 'admin' || x.user_group_role === 'user' || x.user_group_role === 'trial');
  const pending = visibleGroups.filter((x) => x.user_group_role === 'joinRequested');
  const discover = visibleGroups.filter((x) => !x.user_group_role);

  const openRequests = groups
    .filter((x) => x.user_group_role === 'admin')
    .reduce((sum, x) => sum + pendingRequests(x.id), 0);

  const renderGroup = (x: GroupWithUserMappings) => {
    const isGroupAdmin = x.user_group_role === 'admin';
    const requests = isGroupAdmin ? pendingRequests(x.id) : 0;
    const parent = parentName(x);

    return (
      <Item
        key={x.id}
        variant="outline"
        onClick={() => (x.user_group_role === 'joinRequested' ? setJoinRequestedGroup(x) : navigate(`/groups/${x.id}`))}
      >
        <ItemMedia variant="icon">
          <Avatar className="flex size-11 flex-col items-center bg-[color:var(--group-color)]"
            style={{ "--group-color": x.color } as React.CSSProperties}>
            <div className="flex h-full flex-row items-center">
              <Users
                className="size-5"
                style={{ color: "color-mix(in srgb, var(--group-color), white 70%)" }} />
            </div>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{x.name}</ItemTitle>
          <ItemDescription className="line-clamp-2">{x.description}</ItemDescription>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {parent && <Badge variant="outline">{t('groups.subgroupOf', { group: parent })}</Badge>}
            {!x.user_group_role && x.need_request_to_join && (
              <Badge variant="secondary"><Lock />{t('groups.approvalRequired')}</Badge>
            )}
            {(isGroupAdmin || isPlatformAdmin) && !x.visible && (
              <Badge variant="outline"><EyeOff />{t('groups.hidden')}</Badge>
            )}
            {(isGroupAdmin || isPlatformAdmin) && !x.is_public && (
              <Badge variant="outline"><Lock />{t('groups.private')}</Badge>
            )}
          </div>
        </ItemContent>
        <ItemActions>
          {!x.user_group_role && <JoinGroupButton group={x} user={user} />}
          {isGroupAdmin && (
            <div className="flex flex-col items-end gap-1">
              <Badge variant="info"><ShieldCheck />{t('groups.admin')}</Badge>
              {requests > 0 && <Badge variant="warning">{t('groups.openRequests', { count: requests })}</Badge>}
            </div>
          )}
          {x.user_group_role === 'trial' && <Badge variant="secondary">{t('groups.trial')}</Badge>}
          {x.user_group_role === 'joinRequested' && <Badge variant="warning">{t('groups.requested')}</Badge>}
        </ItemActions>
      </Item>
    );
  };

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={t('navigation.groups')}
      primaryAction="default"
      user={user}
      actions={
        <Has perm={['supabase.admin', 'groups.manage.admin']} any>
          <Button variant={"ghost"} size={"icon-lg"} aria-label={t('groups.create')} onClick={async () => {
            const result = await dialogs.open(CreateOrUpdateGroupDialog, { user });
            if (result && result !== 'closed') {
              refetch();
              toast.success(t('groups.createSuccess'));
            } else if (!result) {
              toast.error(t('groups.createError'));
            }
          }}>
            <Plus />
          </Button>
        </Has>
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
          className="flex flex-col gap-2 p-2"
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          {isLoading && <ListSkeleton rows={5} />}

          {!isLoading && error && (
            <ListError
              title={t('groups.loadError')}
              description={t('groups.loadErrorDescription')}
              retryLabel={t('challenge.list.retry')}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !error && openRequests > 0 && (
            <Alert variant="warning">
              <UserPlus />
              <span>{t('groups.openRequestsAlert', { count: openRequests })}</span>
            </Alert>
          )}

          {!isLoading && !error && groups.length > SEARCH_THRESHOLD && (
            <Input
              type="search"
              className="h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              aria-label={t('common.searchPlaceholder')}
            />
          )}

          {!isLoading && !error && visibleGroups.length === 0 && (
            <Empty className="mt-12">
              <EmptyHeader>
                <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
                <EmptyTitle>{t('groups.empty')}</EmptyTitle>
                <EmptyDescription>{t('groups.emptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && !error && mine.length > 0 && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('groups.myGroups')} count={mine.length} />
              {mine.map(renderGroup)}
            </section>
          )}

          {!isLoading && !error && pending.length > 0 && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('groups.pendingGroups')} count={pending.length} />
              {pending.map(renderGroup)}
            </section>
          )}

          {!isLoading && !error && discover.length > 0 && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('groups.discover')} count={discover.length} />
              {discover.map(renderGroup)}
            </section>
          )}
        </div>
      </PullToRefresh>
    </main>

    <Sheet
      open={joinRequestedGroup !== null}
      onOpenChange={(open) => { if (!open) setJoinRequestedGroup(null); }}
    >
      <SheetContent side="bottom" className="rounded-t-xl pb-safe-bottom">
        {joinRequestedGroup && (
          <>
            <SheetHeader className="items-center text-center pt-2">
              {hasTrialExpiredFor(joinRequestedGroup.id) ? (
                <>
                  <div className="rounded-full bg-warning/10 p-3 mb-1">
                    <Clock className="size-6 text-warning" />
                  </div>
                  <SheetTitle>{t('groups.trialExpiredSheet.title')}</SheetTitle>
                  <SheetDescription>
                    {t('groups.trialExpiredSheet.body', { group: joinRequestedGroup.name })}
                  </SheetDescription>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-info/10 p-3 mb-1">
                    <Info className="size-6 text-info" />
                  </div>
                  <SheetTitle>{t('groups.joinRequestedSheet.title')}</SheetTitle>
                  <SheetDescription>
                    {t('groups.joinRequestedSheet.body')}
                  </SheetDescription>
                </>
              )}
            </SheetHeader>
            <SheetFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setJoinRequestedGroup(null)}
              >
                {t('common.close')}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  </div>
}

export default PublicGroupList;
