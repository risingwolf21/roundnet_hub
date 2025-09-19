import { Box, Button, List, Stack, Typography } from '@mui/material';
import { withProfiler } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import React from 'react';
import { useNavigate } from 'react-router';
import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { useDrinks, useInsertHistoryEntryMutation } from '@/tanstack/drinks';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { useGrants } from '../auth/GrantsContext';
import { DrinkCard } from './DrinkCard';
import { EventCard } from './EventCard';
import { ItemCard } from './ItemCard';
import { LoadingDrinkCard } from './LoadingDrinkCard';
import { LoadingEventCard } from './LoadingEventCard';
import { LoadingItemCard } from './LoadingItemCard';

const HomePage = () => {
  const [fetchMode] = useFetchMode();

  const { user, hasPerm } = useGrants();
  const { data: drinks = [], isLoading: isDrinksLoading, refetch: refetchDrinks } = useDrinks();
  const { data: events = [], isLoading: isEventsLoading, refetch: refetchEvents } = useEvents(fetchMode);
  const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useAllItems();
  const notifications = useNotifications();
  const navigate = useNavigate();

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);
  const updateHistory = useInsertHistoryEntryMutation(user);

  return (
    <Layout>
      <PullToRefresh
        onRefresh={() => {
          refetchDrinks();
          refetchEvents();
          refetchItems();
        }}
      >
        {user.groups.length === 0 && (
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
        )}

        <List sx={{ pb: 10 }}>
          <Has feat={'events'}>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: 'bold' }}>
              Events
            </Typography>
            <Box
              sx={{
                display: 'flex',
                overflowX: 'auto',
                gap: 2,
                padding: 1,
              }}
            >
              {isEventsLoading
                ? Array.from({ length: 5 }, (v, k) => k + 1).map((x) => <LoadingEventCard />)
                : events.slice(0, 5).map((event, index) => (
                    <EventCard
                      index={index}
                      user={user}
                      event={event}
                      {...(hasPerm('event.signup')
                        ? {
                            updateAttendance: (user, event, newState) => {
                              updateAttendance.mutate({ user, event, newState });
                            },
                          }
                        : {})}
                    />
                  ))}
            </Box>
          </Has>
          <Has feat={'drinks'} perm={'drinks.purchase'}>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: 'bold' }}>
              Getränke
            </Typography>
            <Box
              sx={{
                display: 'flex',
                overflowX: 'auto',
                gap: 2,
                padding: 1,
              }}
            >
              {isDrinksLoading
                ? Array.from({ length: 5 }, (v, k) => k + 1).map((x) => <LoadingDrinkCard index={x} />)
                : drinks
                    .filter((x: Drink) => !x.deleted && x.active && x.type === 'Drink')
                    .map((drink, index) => (
                      <DrinkCard
                        index={index}
                        drink={drink}
                        insertHistory={(drink) =>
                          updateHistory.mutate(drink, {
                            onSuccess: () => {
                              notifications.show('Getränk erfolgreich gebucht!', {
                                severity: 'success',
                                autoHideDuration: 1500,
                              });
                            },
                            onError: (error) => {
                              notifications.show(`Getränk konnte nicht gebucht werden. ${error.message}`, {
                                severity: 'error',
                              });
                            },
                          })
                        }
                      />
                    ))}
            </Box>
          </Has>
          <Has feat={'items'}>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: 'bold' }}>
              Schlüssel
            </Typography>
            <Box
              sx={{
                display: 'flex',
                overflowX: 'auto',
                gap: 2,
                padding: 1,
              }}
            >
              {isItemsLoading
                ? Array.from({ length: 5 }, (v, k) => k + 1).map((x) => <LoadingItemCard index={x} />)
                : items.map((item, index) => <ItemCard index={index} item={item} user={user} />)}
            </Box>
          </Has>
        </List>
      </PullToRefresh>
    </Layout>
  );
};
export default withProfiler(HomePage);
