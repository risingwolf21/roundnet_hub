import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useSharedGroupMembers } from '@/tanstack/user';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface UserSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UserSearchDialog({ open, onClose }: UserSearchDialogProps) {
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

  const handleSelect = (userId: string) => {
    onClose();
    dialogs.userProfile(userId);
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent variant="fullscreen" className="p-0 flex flex-col">
        <div className="pt-safe-top sticky top-0 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background border-b shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-full -ml-1"
          >
            <X className="h-5 w-5" />
          </Button>
          <Input
            autoFocus
            placeholder={t('search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent px-0 text-base"
          />
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
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
                    onClick={() => handleSelect(member.id)}
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
        </ScrollArea>
      </AlertDialogContent>
    </AlertDialog>
  );
}
