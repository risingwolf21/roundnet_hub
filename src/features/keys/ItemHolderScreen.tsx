import { Has } from '@/hooks/useGrants';
import { fetchGroupMemberIds } from '@/tanstack/groups';
import { useAllItems, useHandoverKeyMutation } from '@/tanstack/items';
import { captureException } from '@sentry/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useGrants } from '../auth/GrantsContext';

import { ListError, ListSectionHeader, ListSkeleton, sideBar, SideBarTone } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils';
import { Info, Key, Plus, TriangleAlert, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EditOrAddItemDialog } from './dialogs/EditOrAddItemDialog';
import { KeyHandOverDialog } from './dialogs/KeyHandOverDialog';

const EMPTY_KEY: ItemUpdate = { name: '', color: '#000000', created_at: '', current_holder: null };

const ItemHolderScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actionProcessed = useRef(false);

  const dialogs = useDialogs();
  const { user, hasPerm } = useGrants();
  const { t } = useTranslation();

  const handoverKeyMutation = useHandoverKeyMutation();

  const { data: keyHolders = [], isLoading, error, refetch } = useAllItems();

  useEffect(() => {
    if (!hasPerm('items.update.holder')) return;

    if (actionProcessed.current) return;

    const type = searchParams.get('type');
    const key = searchParams.get('key');
    if (!key || !type) {
      return;
    }
    const keyId = +key;
    const keyHolder = keyHolders.find((x) => x.id === keyId);
    if (!keyHolder) return;

    actionProcessed.current = true;

    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.delete('type');
      nextParams.delete('key');
      return nextParams;
    }, { replace: true });

    const processAction = async () => {
      let targetUser = null;

      if (type === 'handover') {
        targetUser = await dialogs.selectSingleUser(
          [user.id, keyHolder.current_holder ?? ""],
          keyHolder.group ? await fetchGroupMemberIds(keyHolder.group) : undefined
        );
        if (!targetUser) return;
      } else if (type === 'take') {
        targetUser = user;
      } else {
        return;
      }

      const result = await dialogs.open(KeyHandOverDialog, {
        itemHolder: keyHolder,
        selectedUser: targetUser
      });

      if (result) {
        handoverKeyMutation.mutate(
          { keyHolder: keyHolder, user: targetUser },
          {
            onError: (error) => {
              captureException(error);
              toast.error(t('keyHandOverError', { error: error.message }));
            },
          }
        );
      }
    };

    processAction();
  }, [searchParams, keyHolders, user, hasPerm, dialogs, handoverKeyMutation, t, setSearchParams]);

  /** Confirms with `shownUser` in the dialog, then records `recipient` as the new holder. */
  const handOver = async (item: FullItemHolder, shownUser: User | null, recipient: User) => {
    const confirmed = await dialogs.open(KeyHandOverDialog, { itemHolder: item, selectedUser: shownUser });
    if (!confirmed) return;
    handoverKeyMutation.mutate(
      { keyHolder: item, user: recipient },
      {
        onSuccess: () => toast.success(t('keys.screen.handoverSuccess')),
        onError: (error) => {
          captureException(error);
          toast.error(t('keyHandOverError', { error: error.message }));
        },
      }
    );
  };

  const mine = keyHolders.filter((x) => x.full_current_holder?.id === user.id);
  const unassigned = keyHolders.filter((x) => !x.full_current_holder);
  const others = keyHolders.filter((x) => x.full_current_holder && x.full_current_holder.id !== user.id);
  const canManage = hasPerm('items.manage');
  const canHandOver = hasPerm('items.update.holder');

  const renderRow = (x: FullItemHolder, tone: SideBarTone) => {
    const isMine = x.full_current_holder?.id === user.id;
    const pending = handoverKeyMutation.isPending && handoverKeyMutation.variables?.keyHolder.id === x.id;
    return (
      <Item
        key={x.id_uuid}
        variant="outline"
        className={cn(sideBar(tone), canManage && 'cursor-pointer')}
        onClick={canManage ? () => dialogs.open(EditOrAddItemDialog, { itemToEdit: x }) : undefined}
      >
        <ItemMedia>
          <span
            className="grid size-10 place-items-center rounded-lg bg-[color:var(--item-color)]/15 text-[color:var(--item-color)]"
            style={{ '--item-color': x.color || 'var(--primary)' } as React.CSSProperties}
          >
            <Key className="size-5" />
          </span>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="line-clamp-2 break-words">{x.name}</ItemTitle>
          <ItemDescription className="flex min-w-0 items-center gap-1.5">
            {x.full_current_holder ? (
              <>
                <Avatar size="sm" className="size-5">
                  <AvatarImage src={x.full_current_holder.avatarUrl || undefined} alt="" />
                  <AvatarFallback className="text-[10px]">{getInitials(x.full_current_holder.name ?? '')}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{isMine ? t('keys.screen.you') : x.full_current_holder.name}</span>
              </>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-warning">
                <TriangleAlert className="size-3.5 shrink-0" />
                <span className="truncate">{t('keys.screen.noHolder')}</span>
              </span>
            )}
          </ItemDescription>
          {canManage && x.type && <span className="text-xs text-muted-foreground">{t(`itemType.${x.type}`)}</span>}
        </ItemContent>
        {canHandOver && (
          <ItemActions>
            <Button
              variant={isMine ? 'default' : 'outline'}
              disabled={pending}
              onClick={async (e) => {
                e.stopPropagation();
                if (isMine) {
                  // A group's key can only go to a full member of that group.
                  const target = await dialogs.selectSingleUser([user.id], x.group ? await fetchGroupMemberIds(x.group) : undefined);
                  if (target) await handOver(x, target, target);
                } else {
                  await handOver(x, x.full_current_holder, user);
                }
              }}
            >
              {pending && <Spinner />}
              {isMine ? t('handover_key') : t('take_key')}
            </Button>
          </ItemActions>
        )}
      </Item>
    );
  };

  const sections: { key: string; title: string; icon: React.ReactNode; tone: SideBarTone; items: FullItemHolder[] }[] = [
    { key: 'mine', title: t('keys.screen.mine'), icon: <UserCheck />, tone: 'primary', items: mine },
    { key: 'unassigned', title: t('keys.screen.unassigned'), icon: <TriangleAlert />, tone: 'warning', items: unassigned },
    { key: 'others', title: t('keys.screen.others'), icon: <Users />, tone: 'neutral', items: others },
  ];

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("browse.keys")}
        user={user}
        actions={
          <Has perm={"items.manage"}>
            <Button size={"icon-lg"} variant={"ghost"} aria-label={t('keys.dialog.create')} onClick={() => dialogs.open(EditOrAddItemDialog, { itemToEdit: EMPTY_KEY })}>
              <Plus />
            </Button>
          </Has>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={async () => { await refetch(); }}>
          <div className='mx-auto flex w-full max-w-5xl flex-col gap-2 p-2' style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            <Alert variant="info">
              <Info />
              <AlertDescription className="text-xs">{t('keys.screen.disclaimer')}</AlertDescription>
            </Alert>
            {!canHandOver && !isLoading && !error && keyHolders.length > 0 && (
              <p className="px-2 text-xs text-muted-foreground">{t('keys.screen.noHandoverPermission')}</p>
            )}

            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : error ? (
              <ListError
                title={t('keys.screen.loadError')}
                description={t('keys.screen.loadErrorDescription')}
                retryLabel={t('keys.screen.retry')}
                onRetry={() => refetch()}
              />
            ) : keyHolders.length === 0 ? (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Key /></EmptyMedia>
                  <EmptyTitle>{t('keys.screen.empty')}</EmptyTitle>
                  <EmptyDescription>{t('keys.screen.emptyDescription')}</EmptyDescription>
                  <Has perm="items.manage">
                    <EmptyDescription>{t('keys.screen.emptyAdminHint')}</EmptyDescription>
                  </Has>
                </EmptyHeader>
              </Empty>
            ) : (
              sections.filter((section) => section.items.length > 0).map((section) => (
                <section key={section.key} className="flex flex-col gap-2">
                  <ListSectionHeader icon={section.icon} title={section.title} count={section.items.length} />
                  {section.items.map((x) => renderRow(x, section.tone))}
                </section>
              ))
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default ItemHolderScreen;
