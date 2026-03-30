import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { useFetchMode } from '@/hooks/useFetchMode';
import { sendMetricsToSentry } from '@/instrument';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import AddIcon from '@mui/icons-material/Add';
import { Button, List, Typography } from '@mui/material';
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
import { EventItemShadcn } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';

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
      </Stack>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <AppBar
        title="Events Übersicht"
        user={user}
        actions={
          <Button variant="text" color="inherit" onClick={() => dialogs.open(CreateOrUpdateEventDialog, { option: 'InsertEvent' })}>
            <AddIcon />
          </Button>
        }
      />

      <PullToRefresh onRefresh={() => refetch()}>
        <div className="flex w-full max-w-lg flex-col gap-2">
          {Object.entries(groupBy(events, (x) => startOfISOWeek(x.startingDateTime))).map(
            ([key, value]: [string, EventsUserView[]]) => (
              <div key={key} className="flex w-full max-w-lg gap-2 px-2 flex-col">
                <div className="text-sm font-semibold ml-2">
                  {getISOWeek(key) === getISOWeek(new Date())
                    ? 'Diese Woche'
                    : getISOWeek(key) === getISOWeek(new Date()) + 1
                      ? 'Nächste Woche'
                      : format(key, 'dd.MM.yyyy') + ' - ' + format(endOfISOWeek(key), 'dd.MM.yyyy')}
                </div>
                {value.map((event: EventsUserView) => (
                  <EventItemShadcn
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
        </div>
      </PullToRefresh>
    </div>
  );
};

export default withProfiler(EventScreen);
