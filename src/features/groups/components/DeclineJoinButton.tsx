import { ThumbDown } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useNotifications } from '@toolpad/core';
import { useDeclineRequestMutation } from '../query/declineRequestMutation';

export const DeclineJoinButton = ({ group, user }: { group: Group; user: User }) => {
  const notifications = useNotifications();
  const declineJoinMutation = useDeclineRequestMutation(group);

  return (
    <IconButton
      disabled={declineJoinMutation.isPending}
      onClick={() =>
        declineJoinMutation.mutate(user, {
          onError: (error) => {
            notifications.show('Anfrage konnte nicht gelöscht werden. ' + error.message, { severity: 'error' });
          },
          onSuccess: () => {
            notifications.show('Anfrage erfolgreich gelöscht.', { severity: 'success' });
          },
        })
      }
    >
      <ThumbDown color="error" />
    </IconButton>
  );
};
