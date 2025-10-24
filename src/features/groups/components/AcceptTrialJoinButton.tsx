import { useChangeUserRoleMutation } from '@/tanstack/groups';
import CrueltyFreeIcon from '@mui/icons-material/CrueltyFree';
import IconButton from '@mui/material/IconButton';
import { useDialogs, useNotifications } from '@toolpad/core';

export const AcceptTrialJoinButton = ({ group, user }: { group: Group; user: User }) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const acceptJoinMutation = useChangeUserRoleMutation();

  return (
    <IconButton
      disabled={acceptJoinMutation.isPending}
      onClick={async () => {
        const confirmed = await dialogs.confirm("Willst du diesen Benutzer als Probenutzer annehmen?", {
          title: "Probenutzer annehmen",
          okText: "Annehmen",
          cancelText: "Abbrechen",
        });
        if (confirmed) {
          acceptJoinMutation.mutate({ user: user, group: group, new_role: "trial" }, {
            onError: (error) => {
              notifications.show('Anfrage konnte nicht akzeptiert werden. ' + error.message, { severity: 'error' });
            },
            onSuccess: () => {
              notifications.show('Anfrage erfolgreich akzeptiert.', { severity: 'success' });
            },
          })
        }
      }}>
      <CrueltyFreeIcon color="success" />
    </IconButton>
  );
};
