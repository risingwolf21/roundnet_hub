import ThumbUp from '@mui/icons-material/ThumbUp';
import IconButton from '@mui/material/IconButton';
import { useNotifications } from '@toolpad/core';
import { useAcceptRequestMutation } from '../query/acceptRequestMutation';

export const AcceptJoinButton = ({ group, user }: { group: Group; user: User }) => {
  const notifications = useNotifications();
  const acceptJoinMutation = useAcceptRequestMutation(group);

  return (
    <IconButton
      disabled={acceptJoinMutation.isPending}
      onClick={() =>
        acceptJoinMutation.mutate(user, {
          onError: (error) => {
            notifications.show('Anfrage konnte nicht akzeptiert werden. ' + error.message, { severity: 'error' });
          },
          onSuccess: () => {
            notifications.show('Anfrage erfolgreich akzeptiert.', { severity: 'success' });
          },
        })
      }
    >
      <ThumbUp color="success" />
    </IconButton>
  );
};
