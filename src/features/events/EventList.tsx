import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { sendMetricsToSentry } from '@/instrument';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import { EventRepeat, FilterAlt } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, Fab, IconButton, List, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import { withProfiler } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import { endOfISOWeek, format, getISOWeek, startOfISOWeek } from 'date-fns';
import { t } from 'i18next';
import groupBy from 'lodash.groupby';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import { EventItem } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';
import { FilterEventListDialog } from './dialogs/FilterEventListDialog';

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

  if (isLoading) {
    return (
      <List>
        {Array.from({ length: 10 }, (_v, k) => k + 1).map((x) => (
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
          {createEventFab}
        </Stack>
      </Stack>
    );
  }

  return (
    <Layout appBarActions={
      <>
        {
          !isLoading && <IconButton onClick={async () => {
            const result = await dialogs.open(FilterEventListDialog, { currentFetchMode: fetchMode });
            setFetchMode(result);
          }}>
            <FilterAlt sx={{ color: 'white' }} />
          </IconButton>
        }
        {
          !isLoading && <Has perm={'event.edit'}>
            <IconButton onClick={() => navigate('/training/recurringEvents')}>
              <EventRepeat sx={{ color: 'white' }} />
            </IconButton>
          </Has>
        }
      </>
    }>
      <PullToRefresh onRefresh={() => refetch()}>
        <div className="flex w-full max-w-lg flex-col gap-2">
          {Object.entries(groupBy(events, (x) => startOfISOWeek(x.startingDateTime))).map(
            ([key, value]: [string, EventsUserView[]]) => (
              <div key={key} className="flex w-full max-w-lg gap-2 px-2 flex-col">
                <div className="text-sm font-semibold">
                  {getISOWeek(key) === getISOWeek(new Date())
                    ? 'Diese Woche'
                    : getISOWeek(key) === getISOWeek(new Date()) + 1
                      ? 'Nächste Woche'
                      : format(key, 'dd.MM.yyyy') + ' - ' + format(endOfISOWeek(key), 'dd.MM.yyyy')}
                </div>
                {value.map((event: EventsUserView) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    t={t}
                    attendanceUpdating={updateAttendance.isPending && updateAttendance.context?.event.id === event.id}
                    attendEvent={() => {
                      updateAttendance.mutate({ event, user, newState: 'Attending' });
                      sendMetricsToSentry('event_attend_from_list', 1);
                    }}
                    declineEvent={() => {
                      updateAttendance.mutate({ event, user, newState: 'Declined' });
                      sendMetricsToSentry('event_decline_from_list', 1);
                    }}
                    onClick={() => {
                      navigate('/training/event/' + event.id);
                    }}
                  />
                ))}
              </div>
            )
          )}

          <Stack
            direction={'row-reverse'}
            spacing={2}
            sx={{ position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', right: '16px', zIndex: 1 }}
          >
            {createEventFab}
          </Stack>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default withProfiler(EventScreen);
