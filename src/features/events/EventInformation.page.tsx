import { Delete, DoNotDisturb, DoNotDisturbOff, Edit, MoreVert } from '@mui/icons-material';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useDialogs, useNotifications } from '@toolpad/core';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import Layout from 'src/components/Layout';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useAuthentication } from 'src/features/auth/AuthContext';
import EventInformationLoading from 'src/features/events/components/EventInformationLoading';
import { CancelTrainingDialog } from 'src/features/events/dialogs/CancelTrainingDialog';
import { DeleteEventDialog } from 'src/features/events/dialogs/DeleteEventDialog';
import { EditEventOptionsDialog } from 'src/features/events/dialogs/EditEventOptionsDialog';
import { CreateOrUpdateEventDialog } from 'src/features/events/dialogs/CreateOrUpdateEventDialog';
import { useAllItems } from 'src/tanstack/items';
import { useFetchMode } from 'src/hooks/useFetchMode';
import { SupabaseEventRepository } from 'src/repository/EventRepository';
import { EventsUserView } from 'src/types/supabaseTypes';
import { can } from 'src/utils/PermissionService';
import { EventTable } from 'types/supabase';
import EventInformation from './EventInformation';
import { PlaceType } from './types';
import { queryClient } from 'src/App';
import { useCancelTrainingMutation, useDeleteTrainingMutation } from 'src/tanstack/events';

const EventInformationProvider = () => {
  const { selectedEventId } = useParams();
  const { user } = useAuthentication();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const { t } = useTranslation();
  const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLButtonElement) | null>(null);
  const [fetchMode] = useFetchMode();

  const cancelTrainingMutation = useCancelTrainingMutation(fetchMode);
  const deleteTrainingMutation = useDeleteTrainingMutation(fetchMode);
  const { data: event, isLoading, refetch } = useQuery<EventsUserView | null>({
    queryKey: ["events", selectedEventId],
    enabled: !!selectedEventId,
    queryFn: () => SupabaseEventRepository.fetchUserEvent(selectedEventId!)
  });
  const { data: keyHolders = [] } = useAllItems();

  useEffect(() => {
    if (event) {
      setSelectedEventPlace(event.place ? (JSON.parse(event.place?.toString() ?? '') as PlaceType) : null);
    }
  }, [event]);

  if (isLoading) {
    return <Layout appBarConfig={{
      navigateBackPath: "/training/list",
      title: "",
      showProfile: false,
    }}>
      <EventInformationLoading />
    </Layout>
  }

  if (!event) {
    return null;
  }

  return <Layout appBarConfig={{
    navigateBackPath: "/training/list",
    title: event.title!,
    showProfile: false,
  }}
    appBarActions={
      (can('update', 'event') || can('delete', 'event')) &&
      <>
        <IconButton sx={{ color: '#fff', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVert />
        </IconButton>
        <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            hidden={!can('update', 'event')}
            onClick={async () => {
              setAnchorEl(null)
              const result = await dialogs.open(EditEventOptionsDialog);
              if (result) {
                await dialogs.open(CreateOrUpdateEventDialog, {
                  event: {
                    ...event,
                    group: event.group?.id ?? null
                  } as EventTable, eventGroup: event.group, option: result
                })
              }
            }}
          >
            <ListItemIcon>
              <Edit />
            </ListItemIcon>
            <ListItemText primary="Bearbeiten" />
          </MenuItem>
          <MenuItem
            hidden={!can('update', 'event')}
            onClick={async () => {
              setAnchorEl(null)
              const result = await dialogs.open(CancelTrainingDialog, event);
              if (result) {
                cancelTrainingMutation.mutate({ event, isCancelled: !event.isCancelled }, {
                  onError: (error) => {
                    captureException(error);
                    notifications.show(error.message, { severity: 'error' });
                  }
                })
              }
            }}
          >
            <ListItemIcon>{event.isCancelled ? <DoNotDisturbOff /> : <DoNotDisturb />}</ListItemIcon>
            <ListItemText primary={event.isCancelled ? 'Stattfinden' : 'Absagen'} />
          </MenuItem>
          <MenuItem
            hidden={!can('delete', 'event')}
            onClick={async () => {
              setAnchorEl(null);
              const result = await dialogs.open(DeleteEventDialog, event);
              if (result) {
                deleteTrainingMutation.mutate({ event, type: result }, {
                  onSuccess: () => {
                    navigate('/training/list', { replace: true });
                  },
                  onError: (error) => {
                    captureException(error);
                    notifications.show(error.message, { severity: 'error' });
                  }
                })
              }
            }}
          >
            <ListItemIcon>
              <Delete />
            </ListItemIcon>
            <ListItemText primary="Löschen" />
          </MenuItem>
        </Menu>
      </>
    }>

    <PullToRefresh onRefresh={() => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["events", selectedEventId, "comments"] })
      queryClient.invalidateQueries({ queryKey: ["events", selectedEventId, "attendance"] })
    }}>
      <EventInformation
        t={t}
        keyHolders={keyHolders}
        event={event}
        selectedEventPlace={selectedEventPlace}
        user={user}
        fetchMode={fetchMode}
      />
    </PullToRefresh>

  </Layout >
};

export default EventInformationProvider;
