import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useBlockedUsers, useUnblockUser } from '@/tanstack/moderation';
import { getInitials } from '@/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const BlockedUsersList = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const { data: blocked = [] } = useBlockedUsers(userId);
  const unblock = useUnblockUser(userId);

  if (blocked.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('moderation.blockedList.title')}</h3>
      <p className="text-xs text-muted-foreground">{t('moderation.blockedList.description')}</p>
      {blocked.map((entry) => {
        const name = entry.user?.displayName ?? '';
        return (
          <div key={entry.blocked} className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={entry.user?.avatarUrl || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(name || 'User')}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">{name}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={unblock.isPending}
              onClick={() => unblock.mutate(entry.blocked, { onError: () => toast.error(t('moderation.block.error')) })}
            >
              {t('moderation.blockedList.unblock')}
            </Button>
          </div>
        );
      })}
    </section>
  );
};

export default BlockedUsersList;
