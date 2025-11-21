import { useJoinGroup } from '@/tanstack/groups';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core';

import { useGrants } from '@/features/auth/GrantsContext';
import Button from '@mui/material/Button';

export const JoinGroupButton = ({ group, user }: { group: Group; user: User }) => {
  const notifications = useNotifications();
  const { refetchUserGrants } = useGrants();
  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? 'joinRequested' : 'user');

  return (
    <Button
      disabled={joinGroup.isPending}
      onClick={(event) => {
        joinGroup.mutate(undefined, {
          onError: (e) => {
            captureException(e);
            console.log(e);
            notifications.show('Der Gruppe konnte nicht beigetreten werden.', { severity: 'error' });
          },
          onSuccess: () => {
            refetchUserGrants();
          }
        });
        event.stopPropagation();
      }}
    >
      {joinGroup.isPending ? 'Tritt bei...' : group.need_request_to_join ? 'Anfragen' : 'Beitreten'}
    </Button>
  );
};
