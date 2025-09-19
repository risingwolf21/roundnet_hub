import { List, ListItem, ListItemAvatar, ListItemText, Radio } from '@mui/material';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

type UserRoleDialogProps = {
  open: boolean;
  role: UserRole;
  handleClose: () => void;
  handleSubmit: (role: UserRole) => void;
};

export const UserRoleDialog = ({ open, handleClose, handleSubmit, role }: UserRoleDialogProps) => {
  return (
    <SwipeableDialog open={open} onClose={handleClose} title={'User Role wählen'}>
      <List>
        {(['admin', 'user', 'finance', 'trainer', 'procure'] as UserRole[]).map((x) => (
          <ListItem key={x} onClick={() => handleSubmit(x)}>
            <ListItemAvatar>
              <Radio checked={x === role}></Radio>
            </ListItemAvatar>
            <ListItemText primary={x} />
          </ListItem>
        ))}
      </List>
    </SwipeableDialog>
  );
};
