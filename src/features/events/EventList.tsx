import { EventRepeat, FilterAlt } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, Chip, Fab, List, ListSubheader, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Box, Stack } from '@mui/system';
import { withProfiler } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { format, parse } from 'date-fns';
import { t } from 'i18next';
import { groupBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { useFetchMode } from 'src/hooks/useFetchMode';
import { EventsUserView } from 'src/types/supabaseTypes';
import Layout from '../../components/Layout';
import { can } from '../../utils/PermissionService';
import { useAuthentication } from '../auth/AuthContext';
import { EventItem } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { useEvents, useUpdateAttendanceMutation } from './useAllEvents';
import { useDialogs } from '@toolpad/core';
import { CreateOrUpdateEventDialog } from './EventCreation';


const EventScreen = () => {
  const { user } = useAuthentication();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [fetchMode, setFetchMode] = useFetchMode();

  const { data: events = [], isLoading, error, refetch } = useEvents(fetchMode);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error", actionText: "Neu laden", onAction: () => refetch() })
  }, [error, notifications, refetch])

  const switchEventFetching = (mode: 'upcoming' | 'past') => {
    localStorage.setItem('fetchMode', mode);
    setFetchMode(mode);
  };

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);

  if (isLoading) {
    return <List>
      {
        Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingEventItem key={x} />)
      }
    </List>
  }

  if (events.length === 0) {
    return <Stack spacing={2} direction={"column"} sx={{ height: 300, alignItems: "center", justifyContent: "center" }}>
      <Typography>Es sieht so aus als ob du keine Events siehst</Typography>
      <Typography>Versuch einer Gruppe beizutreten um die Events dieser einzusehen</Typography>
      <Button variant='contained' onClick={() => navigate("/groups/list")}>Gruppe beitreten</Button>
    </Stack>
  }

  return (
    <Layout>
      <Box
        sx={(theme) => ({
          overscrollBehavior: "none",
          [theme.breakpoints.down('xl')]: { pb: 12 },
          [theme.breakpoints.up('xl')]: { pb: 0 },
        })}
      >
        {
          Object.entries(groupBy(events, x => format(x.startingDateTime!, "dd-MM-yyyy")))
            .map(([key, value]) => <table style={{ width: "100%", borderSpacing: 0 }} key={key}>
              <tbody style={{ width: "100%" }}>
                {
                  value.map((event: EventsUserView, index) => <tr style={{ height: "1px" }} key={index + event.id!}>
                    {
                      index === 0 ? <td style={{ position: "sticky", top: 0, padding: 0, height: "inherit" }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: "100%", justifyContent: 'center', mx: 3, py: 1, width: 20 }}>
                          <Typography fontSize={10} textAlign={'center'}>
                            {t('events.startDateDayString', { date: parse(key, "dd-MM-yyyy", new Date()) }).toUpperCase()}
                          </Typography>
                          <Typography variant="h6" fontWeight={'bold'} textAlign={'center'}>
                            {t('events.startDateDay', { date: parse(key, "dd-MM-yyyy", new Date()) }).toUpperCase()}
                          </Typography>
                        </Box>
                      </td> : <td style={{ padding: 0 }}></td>
                    }
                    <td style={{ width: "100%", padding: 0 }}>
                      <EventItem
                        key={event.id}
                        event={event}
                        t={t}
                        attendanceUpdating={updateAttendance.isPending && updateAttendance.context?.event.id! === event.id}
                        attendEvent={() => updateAttendance.mutate({ event, user, newState: 'Attending' })}
                        declineEvent={() => updateAttendance.mutate({ event, user, newState: 'Declined' })}
                        onClick={() => {
                          navigate('/training/event/' + event.id);
                        }}
                      />
                    </td>
                  </tr>)
                }
              </tbody>
            </table>
            )}
      </Box>
      {can('select', 'event') && (
        <Fab
          key="filter"
          sx={{
            position: 'fixed',
            right: '16px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={() => setFilterDialogOpen(true)}
        >
          {<FilterAlt sx={{ color: 'white' }} />}
        </Fab>
      )}
      {can('insert', 'event') && (
        <Fab
          key="insertEvent"
          sx={{
            position: 'fixed',
            right: '88px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={async () => {
            await dialogs.open(CreateOrUpdateEventDialog, { option: "InsertEvent" })
          }}
        >
          {<AddIcon sx={{ color: 'white' }} />}
        </Fab>
      )}
      {can('update', 'event') && (
        <Fab
          key="updateEvent"
          sx={{
            position: 'fixed',
            right: '160px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={() => navigate('/training/recurringEvents')}
        >
          {<EventRepeat sx={{ color: 'white' }} />}
        </Fab>
      )}

      <SwipeableDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        setOpen={() => setFilterDialogOpen(true)}
        title={t('filter')}
      >
        <>
          <List
            sx={{ mx: 2 }}
            subheader={
              <ListSubheader
                sx={{
                  fontWeight: 'bold',
                  lineHeight: 'normal',
                  color: 'black',
                  mb: 2,
                  pl: 0,
                }}
              >
                Events
              </ListSubheader>
            }
          >
            <Grid container spacing={2}>
              <Grid>
                <Chip
                  variant={fetchMode === 'upcoming' ? 'filled' : 'outlined'}
                  label={t('events.upcoming')}
                  color={fetchMode === 'upcoming' ? 'primary' : 'default'}
                  onClick={() => switchEventFetching('upcoming')}
                />
              </Grid>
              <Grid>
                <Chip
                  variant={fetchMode === 'past' ? 'filled' : 'outlined'}
                  label={t('events.past')}
                  color={fetchMode === 'past' ? 'primary' : 'default'}
                  onClick={() => switchEventFetching('past')}
                />
              </Grid>
            </Grid>
          </List>
        </>
      </SwipeableDialog>
    </Layout >
  );
};

export default withProfiler(EventScreen);
