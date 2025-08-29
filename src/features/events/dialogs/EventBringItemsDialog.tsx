import {
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DialogProps, useDialogs } from '@toolpad/core';
import React, { useCallback, useMemo, useState } from 'react';
import { useAuthentication } from 'src/features/auth/AuthProvider';
import { Tables } from 'src/types/supabase-generated.types';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import Slider from '@mui/material/Slider';

type Props = {
  overview: Tables<"event_bring_overview">
  pledges: FullEventPledges[]
}

const EventBringItemsDialog = ({
  payload, open, onClose
}: DialogProps<Props, number | null>) => {

  const theme = useTheme();
  const dialogs = useDialogs();
  const { user, isAuthorized } = useAuthentication();

  const userPledge = useMemo(() => payload.pledges.find(x => x.user_id === user.userId), [user])

  const [value, setValue] = useState(payload.pledges.find(x => x.user_id === user.userId)?.qty ?? 0)

  return (
    <SwipeableDialog
      open={open}
      onClose={() => onClose(null)}
      title="Gegenstand mitbringen"
      actions={<Button onClick={() => onClose(value)}>Speichern</Button>}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
          {payload.overview.name}
        </Typography>
        <Box sx={{ px: 2, mt: 5 }}>
          <Slider
            value={value}
            onChange={(_, v) => setValue(v as number)}
            step={1}
            min={0}
            max={(userPledge ? payload.overview.required_qty : payload.overview.remaining_qty) ?? 0}
            valueLabelDisplay="on"
            marks={true}
          />
        </Box>
        <List disablePadding subheader={<ListSubheader disableGutters sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }}>Beitragende</ListSubheader>}>
          {
            payload.pledges.map(x => <ListItem disableGutters divider>
              <ListItemAvatar>
                <Typography>{x.qty}x</Typography>
              </ListItemAvatar>
              <ListItemText primary={x.user?.displayName ?? ""} />
            </ListItem>)
          }
        </List>
      </Box>
    </SwipeableDialog>
  );
};

export default EventBringItemsDialog;
