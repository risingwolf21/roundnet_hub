import { SwipeableDialog } from '@/components/SwipeableDialog';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

type SelectFeaturePermissionDialogProps = {
  toggle: (feature: Feature | Permission, newValue: boolean) => void;
  list: Feature[] | Permission[];
  enabled: Feature[] | Permission[];
  title: string;
  open: boolean;
  onClose: () => void;
};

export const SelectFeaturePermissionDialog = ({
  toggle,
  list,
  enabled,
  title,
  open,
  onClose,
}: SelectFeaturePermissionDialogProps) => {
  return (
    <SwipeableDialog open={open} onClose={() => onClose()} title={title}>
      <List>
        {list.map((x) => (
          <ListItemButton
            role={undefined}
            onClick={() => {
              toggle(x, !enabled.map((x) => x.name).includes(x.name));
            }}
            dense
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={enabled.map((x) => x.name).includes(x.name)}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': x.name }}
              />
            </ListItemIcon>
            <ListItemText id={x.name} primary={x.name} secondary={x.description} />
          </ListItemButton>
        ))}
      </List>
    </SwipeableDialog>
  );
};
