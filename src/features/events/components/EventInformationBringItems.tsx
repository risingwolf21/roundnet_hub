import { useGrants } from '@/features/auth/GrantsContext';
import { useBringOverview, useBringPledges, useUpsetBringPledges } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import Box from '@mui/material/Box';
import { useDialogs } from '@toolpad/core';
import EventBringItemsDialog from '../dialogs/EventBringItemsDialog';

import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

type EventInformationAttendanceProps = {
  selectedEvent: EventsUserView;
};

const EventInformationBringItems = ({ selectedEvent }: EventInformationAttendanceProps) => {
  const { user } = useGrants();
  const dialogs = useDialogs();

  const { data: bringOverview = [], isLoading } = useBringOverview(selectedEvent.id);
  const { data: bringPledges = [], isLoading: pledgesLoading } = useBringPledges(selectedEvent.id);

  const upsertPledgeItems = useUpsetBringPledges();

  if (isLoading || pledgesLoading || bringOverview.length === 0) return null;

  return (
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
        Gegenstände
      </Typography>
      <List sx={{ p: 0 }}>
        {bringOverview.map((x) => (
          <ListItem
            key={'spotsTaken'}
            sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
            divider
            onClick={() => {
              dialogs
                .open(EventBringItemsDialog, {
                  overview: bringOverview, pledges: bringPledges.filter(x => x.user_id === user.userId).map(x => ({
                    event: x.event, item: x.item.id, qty: x.qty, user: x.user
                  })), user: user
                })
                .then((result) => {
                  if (result.length > 0) {
                    upsertPledgeItems.mutate({
                      user: user.userId,
                      event: selectedEvent.id,
                      items: result.map((r) => ({ item_id: r.item, quantity: r.qty, status: 'pledged' }))
                    });
                  }
                });
            }}
          >
            <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
              {
                x.required_qty && x.required_qty > 0 ? <>
                  <CircularProgress
                    size={'24px'}
                    thickness={8}
                    sx={{ borderRadius: '100%', p: '2px', position: 'relative', zIndex: 2 }}
                    variant="determinate"
                    value={Math.min(x.pledged_qty! / x.required_qty!, 1) * 100}
                  />
                  <CircularProgress
                    variant="determinate"
                    size={'24px'}
                    value={100}
                    thickness={8}
                    sx={{ color: '#eee', p: '2px', position: 'absolute', zIndex: 1 }}
                  />
                </>
                  : <Typography sx={{ fontSize: 16, fontWeight: 'bold', mr: 1 }}>{x.pledged_qty}</Typography>
              }
            </ListItemAvatar>
            <ListItemText primary={x.name + (x.required_qty ? ` (${x.pledged_qty!}/${x.required_qty})` : '')} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default EventInformationBringItems;
