import { useGrants } from '@/features/auth/GrantsContext';
import { useBringOverview, useBringPledges, useUpsetBringPledges } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import {
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import Box from '@mui/material/Box';
import { useDialogs } from '@toolpad/core';
import EventBringItemsDialog from '../dialogs/EventBringItemsDialog';

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
                .open(EventBringItemsDialog, { overview: x, pledges: bringPledges.filter((y) => y.item === x.item_id) })
                .then((result) => {
                  if (result) {
                    upsertPledgeItems.mutate({
                      user: user,
                      item_id: x.item_id,
                      event: selectedEvent,
                      quantity: result,
                      status: 'pledged',
                    });
                  }
                });
            }}
          >
            <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
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
            </ListItemAvatar>
            <ListItemText primary={x.name + ` (${x.pledged_qty!}/${x.required_qty})`} />
          </ListItem>
        ))}
      </List>
      <Divider />
    </Box>
  );
};

export default EventInformationBringItems;
