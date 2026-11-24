import { useGrants } from '@/features/auth/GrantsContext';
import { useAllNotifications } from '@/tanstack/notifications';
import { useEffect } from 'react';

/** Shows the number of unread notifications on the installed app's icon. The service worker sets a dot on push. */
export const AppBadge = () => {
  const { user } = useGrants();
  const { data: notifications } = useAllNotifications(user);
  const unread = notifications?.filter((x) => !x.dismissed_at).length;

  useEffect(() => {
    if (unread === undefined || !('setAppBadge' in navigator)) return;
    (unread > 0 ? navigator.setAppBadge(unread) : navigator.clearAppBadge()).catch(() => undefined);
  }, [unread]);

  return null;
};
