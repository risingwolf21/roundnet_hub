import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { useGroups } from '@/tanstack/groups';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { Check, Lock, Search, SearchX, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type BasePayload = {
  groupsToFilter: string[];
  selectedGroupId?: string | null;
};

const MEMBER_ROLES = ['admin', 'user', 'trial'];

const SearchAndSelectGroupDialog = ({ open, onClose, payload: { groupsToFilter, selectedGroupId } }: DialogProps<BasePayload, Group | null>) => {
  const { t } = useTranslation();
  const { data: groups = [], isLoading, error, refetch } = useGroups();
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const matching = groups
    .filter((g) => !groupsToFilter.includes(g.id))
    .filter((g) => !query || g.name.toLowerCase().includes(query) || g.description?.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  const mine = matching.filter((g) => g.user_group_role && MEMBER_ROLES.includes(g.user_group_role));
  const others = matching.filter((g) => !g.user_group_role || !MEMBER_ROLES.includes(g.user_group_role));

  const parentName = (group: GroupWithUserMappings) =>
    group.parent_group ? groups.find((x) => x.id === group.parent_group)?.name : undefined;

  const renderGroup = (group: GroupWithUserMappings) => {
    const selected = group.id === selectedGroupId;
    const parent = parentName(group);

    return (
      <Item
        key={group.id}
        variant="outline"
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={cn('cursor-pointer', selected && 'border-primary bg-primary/5')}
        onClick={() => onClose(group)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose(group);
          }
        }}
      >
        <ItemMedia variant="icon">
          <Avatar
            className="flex size-11 flex-col items-center bg-[color:var(--group-color)]"
            style={{ '--group-color': group.color } as React.CSSProperties}
          >
            <div className="flex h-full flex-row items-center">
              <Users className="size-5" style={{ color: 'color-mix(in srgb, var(--group-color), white 70%)' }} />
            </div>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="min-w-0">
            <span className="truncate">{group.name}</span>
          </ItemTitle>
          {group.description && <ItemDescription className="line-clamp-2">{group.description}</ItemDescription>}
          {(parent || !group.is_public) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {parent && <Badge variant="outline">{t('groups.subgroupOf', { group: parent })}</Badge>}
              {!group.is_public && <Badge variant="outline"><Lock />{t('groups.private')}</Badge>}
            </div>
          )}
        </ItemContent>
        <ItemActions>
          {selected && <Check className="size-5 text-primary" aria-label={t('groups.picker.selected')} />}
          {!selected && group.user_group_role === 'admin' && <Badge variant="info"><ShieldCheck />{t('groups.admin')}</Badge>}
          {!selected && group.user_group_role === 'trial' && <Badge variant="secondary">{t('groups.trial')}</Badge>}
          {!selected && group.user_group_role === 'joinRequested' && <Badge variant="warning">{t('groups.requested')}</Badge>}
        </ItemActions>
      </Item>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant="fullscreen">
        <DialogHeader variant="appbar">
          <DialogTitle className="flex-1">{t('groups.picker.title')}</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 border-b bg-background px-3 py-2">
          <InputGroup>
            <InputGroupInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              aria-label={t('common.searchPlaceholder')}
              className="rounded-full"
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <DialogBody className="gap-2 bg-muted/30 p-3 pb-safe-bottom">
          {isLoading && <ListSkeleton rows={5} />}

          {!isLoading && error && (
            <ListError
              title={t('groups.loadError')}
              description={t('groups.loadErrorDescription')}
              retryLabel={t('challenge.list.retry')}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !error && matching.length === 0 && (
            <Empty className="mt-12">
              <EmptyHeader>
                <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
                <EmptyTitle>{t('search.noGroups')}</EmptyTitle>
                <EmptyDescription>{t('groups.picker.emptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && !error && mine.length > 0 && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('groups.myGroups')} count={mine.length} />
              {mine.map(renderGroup)}
            </section>
          )}

          {!isLoading && !error && others.length > 0 && (
            <section className="flex flex-col gap-2">
              <ListSectionHeader title={t('groups.picker.others')} count={others.length} />
              <p className="px-2 text-xs text-muted-foreground">{t('groups.picker.othersHint')}</p>
              {others.map(renderGroup)}
            </section>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default SearchAndSelectGroupDialog;
