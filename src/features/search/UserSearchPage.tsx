import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppBar } from '@/components/ui/appbar';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useSharedGroupMembers } from '@/tanstack/user';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const UserSearchPage = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useSharedGroupMembers(user?.id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.displayName ?? m.name ?? '').toLowerCase();
      return name.includes(q);
    });
  }, [members, search]);

  return (
    <div>
      <AppBar
        title={t('search.title')}
        user={user}
        showSearch
        searchPlaceholder={t('search.placeholder')}
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction="back"
      />

      {isLoading ? (
        <div className="py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          {t('search.noResults')}
        </p>
      ) : (
        <div className="py-2">
          {filtered.map((member) => {
            const displayName = member.displayName ?? member.name ?? '?';
            const initials = displayName.slice(0, 2).toUpperCase();
            return (
              <Item
                key={member.id}
                className="px-4 cursor-pointer"
                onClick={() => dialogs.userProfile(member.id)}
              >
                <ItemMedia>
                  <Avatar>
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={displayName} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{displayName}</ItemTitle>
                  {member.last_seen_at && (
                    <ItemDescription>
                      {t('user.lastActive', { date: new Date(member.last_seen_at) })}
                    </ItemDescription>
                  )}
                </ItemContent>
              </Item>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserSearchPage;
