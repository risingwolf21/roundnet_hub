import { eventInThePast, EventsUserView, FullAttendance } from '@/types/supabaseTypes';
import { useDialogs } from '@toolpad/core';
import { ConstellationCreationDialog } from '../dialogs/ConstellationsCreationDialog';

import Sports from '@mui/icons-material/Sports';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

export const EventInformationConstellations = ({
  attendance,
  event,
}: {
  attendance: FullAttendance[];
  event: EventsUserView;
}) => {
  const dialogs = useDialogs();

  return (
    <Box sx={{ p: 0, mt: 2, alignSelf: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold' }} color="text.secondary" gutterBottom>
        Konstellationen
      </Typography>
      <ListItem
        key={'createConstellations'}
        sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
        secondaryAction={
          <Button
            disabled={eventInThePast(event)}
            onClick={() => {
              dialogs.open(ConstellationCreationDialog, {
                users: attendance.filter((x) => x.state === 'Attending').map((x) => x.user),
                event: event,
              });
            }}
          >
            Erstellen
          </Button>
        }
      >
        <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
          <Sports color="success" />
        </ListItemAvatar>
        <ListItemText primary={'Konstellationen erstellen'} />
      </ListItem>
      <Divider />
    </Box>
  );
};
