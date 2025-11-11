import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import EventInformationLoading from '@/features/events/components/EventInformationLoading';
import { CancelTrainingDialog } from '@/features/events/dialogs/CancelTrainingDialog';
import { CreateOrUpdateEventDialog } from '@/features/events/dialogs/CreateOrUpdateEventDialog';
import { DeleteEventDialog } from '@/features/events/dialogs/DeleteEventDialog';
import { EditEventOptionsDialog } from '@/features/events/dialogs/EditEventOptionsDialog';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import { SupabaseEventRepository } from '@/repository/EventRepository';
import { useBringItems, useCancelTrainingMutation, useDeleteTrainingMutation } from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { EventsUserView } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { EventTable } from 'types/supabase';
import EventInformation from './EventInformation';
import { PlaceType } from './types';

import Delete from '@mui/icons-material/Delete';
import DoNotDisturb from '@mui/icons-material/DoNotDisturb';
import DoNotDisturbOff from '@mui/icons-material/DoNotDisturbOff';
import Edit from '@mui/icons-material/Edit';
import MoreVert from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useGrants } from '../auth/GrantsContext';

const EventInformationProvider = () => {
  const { selectedEventId } = useParams();
  const { user } = useGrants();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLButtonElement) | null>(null);
  const [fetchMode] = useFetchMode();

  const cancelTrainingMutation = useCancelTrainingMutation(fetchMode);
  const deleteTrainingMutation = useDeleteTrainingMutation(fetchMode);
  const {
    data: event,
    isLoading,
    refetch,
  } = useQuery<EventsUserView | null>({
    queryKey: ['events', selectedEventId],
    enabled: !!selectedEventId,
    queryFn: () => SupabaseEventRepository.fetchUserEvent(selectedEventId!),
  });
  const { data: allItems = [], isLoading: bringItemsLoading } = useBringItems(event?.id);
  const { data: keyHolders = [], isLoading: keyHoldersLoading } = useAllItems();

  const selectedEventPlace = useMemo<PlaceType | null>(() => {
    if (event && event.place) {
      try {
        const parsed = JSON.parse(event.place.toString());
        const place: PlaceType = {
          name: parsed.name || parsed.label,
          description: parsed.description || null,
          lat: parsed.lat,
          lon: parsed.lon,
        };
        return place;
      } catch (error) {
        captureException(error, (scope) => {
          scope.clear();
          scope.setExtra('place', JSON.stringify(event.place));
          scope.setExtra('event', JSON.stringify(event));
          return scope;
        });
        return null;
      }
    } else {
      return null;
    }
  }, [event]);

  if (isLoading || bringItemsLoading || keyHoldersLoading) {
    return (
      <Layout
        appBarConfig={{
          navigateBackPath: '/training/list',
          title: '',
          showProfile: false,
        }}
      >
        <EventInformationLoading />
      </Layout>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <Layout
      appBarConfig={{
        navigateBackPath: '/training/list',
        title: event.title!,
        showProfile: false,
      }}
      appBarActions={
        <Has perm={['event.edit', 'event.cancel', 'event.delete']} any>
          <>
            <IconButton sx={{ color: 'primary.contrastText', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu
              id="simple-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <Has perm={'event.edit'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(EditEventOptionsDialog);
                    if (result) {
                      await dialogs.open(CreateOrUpdateEventDialog, {
                        event: {
                          ...event,
                          items_enabled: false,
                          group: event.group?.id ?? null,
                        } as EventTable,
                        eventGroup: event.group,
                        option: result,
                        items: allItems
                      });
                    }
                  }}
                >
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText primary={t('events.editEvent')} />
                </MenuItem>
              </Has>
              <Has perm={'event.cancel'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(CancelTrainingDialog, event);
                    if (result) {
                      cancelTrainingMutation.mutate(
                        { event, isCancelled: !event.isCancelled },
                        {
                          onError: (error) => {
                            captureException(error);
                            notifications.show(error.message, { severity: 'error' });
                          },
                        }
                      );
                    }
                  }}
                >
                  <ListItemIcon>{event.isCancelled ? <DoNotDisturbOff /> : <DoNotDisturb />}</ListItemIcon>
                  <ListItemText primary={event.isCancelled ? 'Stattfinden' : 'Absagen'} />
                </MenuItem>
              </Has>
              <Has perm={'event.delete'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(DeleteEventDialog, event);
                    if (result) {
                      deleteTrainingMutation.mutate(
                        { event, type: result, currentUser: user },
                        {
                          onSuccess: () => {
                            navigate('/training/list', { replace: true });
                          },
                          onError: (error) => {
                            captureException(error);
                            notifications.show(error.message, { severity: 'error' });
                          },
                        }
                      );
                    }
                  }}
                >
                  <ListItemIcon>
                    <Delete />
                  </ListItemIcon>
                  <ListItemText primary={t('events.deleteEvent')} />
                </MenuItem>
              </Has>
            </Menu>
          </>
        </Has>
      }
    >
      <PullToRefresh
        onRefresh={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['events', selectedEventId, 'comments'] });
          queryClient.invalidateQueries({ queryKey: ['events', selectedEventId, 'attendance'] });
        }}
      >
        <EventInformation
          t={t}
          keyHolders={keyHolders}
          event={event}
          selectedEventPlace={selectedEventPlace}
          fetchMode={fetchMode}
        />
      </PullToRefresh>
    </Layout>
  );
};

export default EventInformationProvider;
