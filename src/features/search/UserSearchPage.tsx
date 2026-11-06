import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useSharedGroupMembers } from '@/tanstack/user';
import { getInitials } from '@/utils';
import { ChevronRight, Search, SearchX, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const memberName = (m: { displayName?: string | null; name?: string | null }) => m.displayName || m.name || '?';

const UserSearchPage = () => {
  const { t, i18n } = useTranslation();
  const { user, hasPerm } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading, isError, refetch } = useSharedGroupMembers(user?.id);
  // Last activity is private data; only user managers see it.
  const canSeeActivity = hasPerm('users.manage');

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = members
      .filter((m) => !q || memberName(m).toLowerCase().includes(q))
      .sort((a, b) => memberName(a).localeCompare(memberName(b), i18n.resolvedLanguage));

    const byLetter = new Map<string, typeof sorted>();
    for (const m of sorted) {
      const first = memberName(m).charAt(0).toLocaleUpperCase(i18n.resolvedLanguage);
      const letter = /\p{L}/u.test(first) ? first : '#';
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), m]);
    }
    return { letters: [...byLetter.entries()], total: sorted.length };
  }, [members, search, i18n.resolvedLanguage]);

  return (
    <div>
      <AppBar className="!border-b !shadow-sm" title={t('search.title')} user={user} primaryAction="back" />

      <main className="flex flex-col gap-2 p-2 pb-safe-bottom">
        {isLoading && <ListSkeleton rows={6} />}

        {!isLoading && isError && (
          <ListError
            title={t('search.loadError')}
            description={t('search.loadErrorDescription')}
            retryLabel={t('challenge.list.retry')}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && members.length === 0 && (
          <Empty className="mt-12">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>{t('search.noMembers')}</EmptyTitle>
              <EmptyDescription>{t('search.noMembersDescription')}</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => navigate('/groups')}>
              <Users className="size-4" />
              {t('navigation.groups')}
            </Button>
          </Empty>
        )}

        {!isLoading && !isError && members.length > 0 && (
          <>
            <div className="sticky top-14 z-10 -mx-2 bg-background/95 px-2 pb-2 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur">
              <InputGroup>
                <InputGroupInput
                  type="search"
                  placeholder={t('search.placeholder')}
                  aria-label={t('search.placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-full"
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>

            {sections.total === 0 && (
              <Empty className="mt-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
                  <EmptyTitle>{t('search.noResults')}</EmptyTitle>
                  <EmptyDescription>{t('search.noResultsDescription')}</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" onClick={() => setSearch('')}>{t('search.clear')}</Button>
              </Empty>
            )}

            {sections.letters.map(([letter, list]) => (
              <section key={letter} className="flex flex-col gap-2">
                <ListSectionHeader title={letter} count={list.length} />
                {list.map((member) => {
                  const name = memberName(member);
                  return (
                    <Item
                      key={member.id}
                      variant="outline"
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => dialogs.userProfile(member.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          dialogs.userProfile(member.id);
                        }
                      }}
                    >
                      <ItemMedia>
                        <Avatar className="size-11">
                          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                          <AvatarFallback>{getInitials(name).slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="min-w-0"><span className="truncate">{name}</span></ItemTitle>
                        {canSeeActivity && member.last_seen_at && (
                          <ItemDescription>{t('user.lastActive', { date: new Date(member.last_seen_at) })}</ItemDescription>
                        )}
                      </ItemContent>
                      <ItemActions>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </ItemActions>
                    </Item>
                  );
                })}
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
};

export default UserSearchPage;
