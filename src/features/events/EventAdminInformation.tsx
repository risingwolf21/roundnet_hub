import { withProfiler } from '@sentry/react';
import { EventsUserView } from '../../types/supabaseTypes';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import { useNotifications } from '@toolpad/core';
import _ from 'lodash';

type EventInformationProps = {
  event: EventsUserView;
};

const EventAdminInformation = ({ event }: EventInformationProps) => {
  const notifications = useNotifications();

  return <Container>
    <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 'bold' }}>Admin - Informationen</Typography>
        </Box>
        <Divider />
        <ListItemButton
          divider
          dense
          onClick={() =>
            navigator.clipboard.writeText(event.id).then(() => notifications.show('Erfolgreich kopiert'))
          }
        >
          <ListItemText
            primary={
              <Typography variant="body2" style={{ userSelect: 'text' }}>
                {event.id}
              </Typography>
            }
            secondary={'Event Id'}
          />
        </ListItemButton>
        <ListItemButton
          divider
          dense
          onClick={() =>
            navigator.clipboard.writeText(event.key).then(() => notifications.show('Erfolgreich kopiert'))
          }
        >
          <ListItemText
            primary={
              <Typography variant="body2" style={{ userSelect: 'text' }}>
                {event.key}
              </Typography>
            }
            secondary={'Event Key'}
          />
        </ListItemButton>
        {
          _.chunk(Object.entries(_.omit(event, ['id', 'key', 'group'])), 2).map((entry) => <ListItem key={entry.join(",")} dense>
            <Stack direction={'row'} spacing={2} width={'100%'}>
              {
                entry.map((x) => <ListItemText
                  key={x[0]}
                  sx={{ width: '50%' }}
                  primary={JSON.stringify(x[1])}
                  secondary={x[0]}
                />)
              }
            </Stack>
          </ListItem>)
        }
      </CardContent>
    </Card>
  </Container>
};

export default withProfiler(EventAdminInformation);
