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
  overview: Tables<'event_bring_overview'>[];
  pledges: { event: string, item: string, user: User, qty: number }[];
  user: User;
};

const EventBringItemsDialog = ({ payload, open, onClose }: DialogProps<Props, { event: string, item: string, user: User, qty: number }[]>) => {
  const [bringPledges, setBringPledges] = useState(payload.pledges);

  return (
    <SwipeableDialog
      open={open}
      onClose={() => onClose([])}
      title={`${payload.pledges.length > 1 ? "Gegenstände" : "Gegenstand"} bringen`}
      actions={<Button onClick={() => onClose(bringPledges)}>Speichern</Button>}
    >
      <Box sx={{ p: 2 }}>
        <List disablePadding>
          {
            payload.overview.map(x => {
              const pledge = bringPledges.find(p => p.item === x.item_id);
              const qty = pledge?.qty ?? 0;
              const item = pledge?.item ?? x.item_id;

              return <ListItem divider secondaryAction={
                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                  {qty > 0 && (
                    <>
                      <IconButton
                        disableRipple
                        onClick={(event) => {
                          const newQty = Math.max(0, qty - 1);
                          setBringPledges(bringPledges.map(p => p.item === x.item_id ? { ...p, qty: newQty } : p));
                          event.stopPropagation();
                        }}
                      >
                        <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                      </IconButton>
                      <Typography sx={{ p: 1, fontSize: '20px', textAlign: "center", width: "42px", color: 'rgba(0,0,0,0.54)' }}>{qty}</Typography>
                    </>
                  )}
                  <IconButton
                    disableRipple
                    onClick={(event) => {
                      const newQty = qty + 1;
                      if (pledge) {
                        setBringPledges(bringPledges.map(p => p.item === x.item_id ? { ...p, qty: newQty } : p));
                      } else {
                        setBringPledges([...bringPledges, { item: item!, qty: newQty, event: x.event!, user: payload.user }]);
                      }
                      event.stopPropagation();
                    }}
                  >
                    <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                  </IconButton>
                </Box>
              }>
                <ListItemText primary={x.name} />
              </ListItem>
            })
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
    </SwipeableDialog >
  );
};

export default EventBringItemsDialog;
