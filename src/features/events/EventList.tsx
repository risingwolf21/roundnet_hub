import { EventRepeat, FilterAlt } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, Fab, List, Typography } from '@mui/material';
import { Box, Stack } from '@mui/system';
import { withProfiler } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import { format, parse } from 'date-fns';
import { t } from 'i18next';
import { groupBy } from 'lodash';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useFetchMode } from '@/hooks/useFetchMode';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import { useGrants } from '../auth/GrantsContext';
import { EventItem } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';
import { FilterEventListDialog } from './dialogs/FilterEventListDialog';
import { Has } from '@/hooks/useGrants';

const EventScreen = () => {
  const { user } = useGrants();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [fetchMode, setFetchMode] = useFetchMode();

  const { data: events = [], isLoading, error, refetch } = useEvents(fetchMode);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);

  const createEventFab = (
    <Has perm={'event.edit'}>
      <Fab
        hidden={isLoading}
        key="insertEvent"
        color={'secondary'}
        onClick={async () => {
          await dialogs.open(CreateOrUpdateEventDialog, { option: 'InsertEvent' });
        }}
      >
        {<AddIcon sx={{ color: 'white' }} />}
      </Fab>
    </Has>
  );

  const filterFab = !isLoading && (
    <Fab
      key="filter"
      color={'secondary'}
      onClick={async () => {
        const result = await dialogs.open(FilterEventListDialog, { currentFetchMode: fetchMode });
        setFetchMode(result);
      }}
    >
      {<FilterAlt sx={{ color: 'white' }} />}
    </Fab>
  );

  if (isLoading) {
    return (
      <List>
        {Array.from({ length: 10 }, (v, k) => k + 1).map((x) => (
          <LoadingEventItem key={x} />
        ))}
      </List>
    );
  }

  if (events.length === 0) {
    return (
      <Stack
        spacing={2}
        direction={'column'}
        sx={{ height: 300, m: 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography sx={{ textAlign: 'center' }}>Es sieht so aus als ob du keine Events siehst</Typography>
        <Typography sx={{ textAlign: 'center' }}>
          Versuch einer Gruppe beizutreten um die Events dieser einzusehen
        </Typography>
        <Button variant="contained" onClick={() => navigate('/groups/list')}>
          Gruppe beitreten
        </Button>

        <Stack
          direction={'row-reverse'}
          spacing={2}
          sx={{ position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', right: '16px' }}
        >
          {filterFab}
          {createEventFab}
        </Stack>
      </Stack>
    );
  }

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <Box
        sx={(theme) => ({
          overscrollBehavior: 'none',
          overscrollBehaviorY: 'none',
          [theme.breakpoints.down('xl')]: { pb: 12 },
          [theme.breakpoints.up('xl')]: { pb: 0 },
        })}
      >
        {Object.entries(groupBy(events, (x) => format(x.startingDateTime!, 'dd-MM-yyyy'))).map(([key, value]) => (
          <table style={{ width: '100%', borderSpacing: 0 }} key={key}>
            <tbody style={{ width: '100%' }}>
              {value.map((event: EventsUserView, index) => (
                <tr style={{ height: '1px' }} key={index + event.id!}>
                  {index === 0 ? (
                    <td style={{ position: 'sticky', top: 0, padding: 0, height: 'inherit' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          justifyContent: 'center',
                          mx: 3,
                          py: 1,
                          width: 20,
                        }}
                      >
                        <Typography fontSize={10} textAlign={'center'}>
                          {t('events.startDateDayString', { date: parse(key, 'dd-MM-yyyy', new Date()) }).toUpperCase()}
                        </Typography>
                        <Typography variant="h6" fontWeight={'bold'} textAlign={'center'}>
                          {t('events.startDateDay', { date: parse(key, 'dd-MM-yyyy', new Date()) }).toUpperCase()}
                        </Typography>
                      </Box>
                    </td>
                  ) : (
                    <td style={{ padding: 0 }}></td>
                  )}
                  <td style={{ width: '100%', padding: 0 }}>
                    <EventItem
                      key={event.id}
                      event={event}
                      t={t}
                      attendanceUpdating={
                        updateAttendance.isPending && updateAttendance.context?.event.id! === event.id
                      }
                      attendEvent={() => updateAttendance.mutate({ event, user, newState: 'Attending' })}
                      declineEvent={() => updateAttendance.mutate({ event, user, newState: 'Declined' })}
                      onClick={() => {
                        navigate('/training/event/' + event.id);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </Box>

      <Stack
        direction={'row-reverse'}
        spacing={2}
        sx={{ position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', right: '16px' }}
      >
        {filterFab}
        {createEventFab}
        <Has perm={'event.edit'}>
          <Fab
            hidden={isLoading}
            key="updateEvent"
            color={'secondary'}
            onClick={() => navigate('/training/recurringEvents')}
          >
            {<EventRepeat sx={{ color: 'white' }} />}
          </Fab>
        </Has>
      </Stack>
    </PullToRefresh>
  );
};

export default withProfiler(EventScreen);
