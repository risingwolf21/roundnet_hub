import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Search, SearchX, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BasePayload = {
  usersToFilter: string[];
  /** When set, only these users can be picked (e.g. the members of a group). */
  onlyUsers?: string[];
  option: 'single' | 'multiple';
};

type SearchAndSelectUserDialogProps = DialogProps<BasePayload, User[] | User | null>;

const userName = (u: Pick<User, 'displayName' | 'name'>) => u.displayName || u.name || '?';

const SearchAndSelectUserDialog = ({ open, onClose, payload: { usersToFilter, onlyUsers, option } }: SearchAndSelectUserDialogProps) => {
  const { t, i18n } = useTranslation();
  const { hasPerm } = useGrants();
  const multiple = option === 'multiple';
  // E-mail addresses are private; only user managers need them to tell people with the same name apart.
  const canSeeEmail = hasPerm('users.manage');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ['users', 'searchAndSelectDialog', ...usersToFilter, 'only', ...(onlyUsers ?? [])],
    queryFn: async () => {
      if (onlyUsers?.length === 0) return [];
      let query = supabase.schema('public').from('user').select('*');
      if (onlyUsers) query = query.in('id', onlyUsers);
      const excluded = usersToFilter.filter(Boolean);
      if (excluded.length > 0) query = query.not('id', 'in', `(${excluded.join(',')})`);
      const result = await query.throwOnError();

      return result.data ?? [];
    },
  });

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = users
      .filter((u) => !q || userName(u).toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
      .sort((a, b) => userName(a).localeCompare(userName(b), i18n.resolvedLanguage));

    const byLetter = new Map<string, User[]>();
    for (const u of sorted) {
      const first = userName(u).charAt(0).toLocaleUpperCase(i18n.resolvedLanguage);
      const letter = /\p{L}/u.test(first) ? first : '#';
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), u]);
    }
    return { letters: [...byLetter.entries()], total: sorted.length };
  }, [users, search, i18n.resolvedLanguage]);

  const toggle = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const pick = (user: User) => (multiple ? toggle(user.id) : onClose(user));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant="fullscreen">
        <DialogHeader variant="appbar">
          <DialogTitle className="flex-1">{t(multiple ? 'search.picker.titleMultiple' : 'search.picker.title')}</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 border-b bg-background px-3 py-2">
          <InputGroup>
            <InputGroupInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              className="rounded-full"
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <DialogBody className="gap-2 bg-muted/30 p-3 pb-safe-bottom">
          {isLoading && <ListSkeleton rows={6} />}

          {!isLoading && isError && (
            <ListError
              title={t('search.loadError')}
              description={t('search.loadErrorDescription')}
              retryLabel={t('challenge.list.retry')}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !isError && users.length === 0 && (
            <Empty className="mt-12">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>{t('search.noUsers')}</EmptyTitle>
                <EmptyDescription>{t('search.picker.noUsersDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && !isError && users.length > 0 && sections.total === 0 && (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
                <EmptyTitle>{t('search.noResults')}</EmptyTitle>
                <EmptyDescription>{t('search.noResultsDescription')}</EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => setSearch('')}>{t('search.clear')}</Button>
            </Empty>
          )}

          {!isLoading && !isError && sections.letters.map(([letter, list]) => (
            <section key={letter} className="flex flex-col gap-2">
              <ListSectionHeader title={letter} count={list.length} />
              {list.map((user) => {
                const name = userName(user);
                const selected = selectedIds.includes(user.id);
                return (
                  <Item
                    key={user.id}
                    variant="outline"
                    role={multiple ? 'checkbox' : 'button'}
                    aria-checked={multiple ? selected : undefined}
                    tabIndex={0}
                    className={cn('cursor-pointer', selected && 'border-primary bg-primary/5')}
                    onClick={() => pick(user)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        pick(user);
                      }
                    }}
                  >
                    <ItemMedia>
                      <Avatar className="size-11">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                        <AvatarFallback>{getInitials(name).slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="min-w-0"><span className="truncate">{name}</span></ItemTitle>
                      {canSeeEmail && user.email && (
                        <ItemDescription className="line-clamp-1 break-all">{user.email}</ItemDescription>
                      )}
                    </ItemContent>
                    {multiple && (
                      <ItemActions>
                        <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none size-5" />
                      </ItemActions>
                    )}
                  </Item>
                );
              })}
            </section>
          ))}
        </DialogBody>

        {multiple && (
          <DialogFooter variant="fullscreen">
            <Button
              className="w-full"
              disabled={selectedIds.length === 0}
              onClick={() => onClose(users.filter((u) => selectedIds.includes(u.id)))}
            >
              {selectedIds.length === 0
                ? t('search.picker.selectSome')
                : t('search.picker.addCount', { count: selectedIds.length })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchAndSelectUserDialog;
