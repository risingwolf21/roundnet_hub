import { useGrants } from '@/features/auth/GrantsContext';
import { Tables } from '@/types/supabase-generated.types';
import { DialogProps } from '@toolpad/core';
import { useState } from 'react';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';

type Props = {
  overview: Tables<'event_bring_overview'>;
  pledges: FullEventPledges[];
};

const EventBringItemsDialog = ({ payload, open, onClose }: DialogProps<Props, number | null>) => {
  const { user } = useGrants();

  const [value, setValue] = useState(payload.pledges.find((x) => x.user_id === user.userId)?.qty ?? 0);

  return (
    <SwipeableDialog
      open={open}
      onClose={() => onClose(null)}
      title="Gegenstand mitbringen"
      actions={<Button onClick={() => onClose(value)}>Speichern</Button>}
    >
      <Box sx={{ p: 2 }}>
        <ListItem secondaryAction={
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            {value > 0 && (
              <>
                <IconButton
                  disableRipple
                  onClick={(event) => {
                    setValue(value - 1);
                    event.stopPropagation();
                  }}
                >
                  <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
                <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>{value}</Typography>
              </>
            )}
            <IconButton
              disableRipple
              onClick={(event) => {
                setValue(value + 1);
                event.stopPropagation();
              }}
            >
              <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
            </IconButton>
          </Box>
        }>
          <ListItemText primary={"Wie oft bringst du den Gegenstand mit?"} />
        </ListItem>
        <List
          disablePadding
          subheader={
            <ListSubheader disableGutters sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }}>
              Beitragende
            </ListSubheader>
          }
        >
          {payload.pledges.map((x) => (
            <ListItem disableGutters divider>
              <ListItemAvatar>
                <Typography>{x.qty}x</Typography>
              </ListItemAvatar>
              <ListItemText primary={x.user?.displayName ?? ''} />
            </ListItem>
          ))}
        </List>
      </Box>
    </SwipeableDialog>
  );
};

export default EventBringItemsDialog;
