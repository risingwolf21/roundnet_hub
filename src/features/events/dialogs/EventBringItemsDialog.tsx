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

const EventBringItemsDialog = ({ payload, open, onClose }: DialogProps<Props, Tables<'event_bring_pledges'>[]>) => {
  const [bringPledges, setBringPledges] = useState(payload.pledges);

  return (
    <SwipeableDialog
      open={open}
      onClose={() => onClose([])}
      title={`${payload.pledges.length > 1 ? "Gegenstände" : "Gegenstand"} bringen`}
      actions={<Button onClick={() => onClose(bringPledges.filter(x => x.qty > 0).map(x => ({ event: x.event, item: x.item.id, id: x.id, created_at: x.created_at, notes: x.notes, qty: x.qty, status: x.status, updated_at: x.updated_at, user_id: x.user_id })))}>Speichern</Button>}
    >
      <Box sx={{ p: 2 }}>
        <List disablePadding>
          {
            bringPledges.map(x => <ListItem divider secondaryAction={
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                {x.qty > 0 && (
                  <>
                    <IconButton
                      disableRipple
                      onClick={(event) => {
                        const newQty = Math.max(0, x.qty - 1);
                        setBringPledges(bringPledges.map(p => p.item === x.item ? { ...p, qty: newQty } : p));
                        event.stopPropagation();
                      }}
                    >
                      <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                    </IconButton>
                    <Typography sx={{ p: 1, fontSize: '20px', textAlign: "center", width: "42px", color: 'rgba(0,0,0,0.54)' }}>{x.qty}</Typography>
                  </>
                )}
                <IconButton
                  disableRipple
                  onClick={(event) => {
                    const newQty = x.qty + 1;
                    setBringPledges(bringPledges.map(p => p.item === x.item ? { ...p, qty: newQty } : p));
                    event.stopPropagation();
                  }}
                >
                  <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
              </Box>
            }>
              <ListItemText primary={x.item.name} />
            </ListItem>)
          }
        </List>
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
