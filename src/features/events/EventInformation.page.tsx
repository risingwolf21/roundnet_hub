import { Delete, DoNotDisturb, DoNotDisturbOff, Edit, MoreVert } from '@mui/icons-material';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useDialogs, useNotifications } from '@toolpad/core';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { queryClient } from 'src/lib/queryClient';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useGrants } from 'src/features/auth/GrantsContext';
import EventInformationLoading from 'src/features/events/components/EventInformationLoading';
import { CancelTrainingDialog } from 'src/features/events/dialogs/CancelTrainingDialog';
import { CreateOrUpdateEventDialog } from 'src/features/events/dialogs/CreateOrUpdateEventDialog';
import { DeleteEventDialog } from 'src/features/events/dialogs/DeleteEventDialog';
import { EditEventOptionsDialog } from 'src/features/events/dialogs/EditEventOptionsDialog';
import { useFetchMode } from 'src/hooks/useFetchMode';
import { SupabaseEventRepository } from 'src/repository/EventRepository';
import { useCancelTrainingMutation, useDeleteTrainingMutation } from 'src/tanstack/events';
import { useAllItems } from 'src/tanstack/items';
import { EventsUserView } from 'src/types/supabaseTypes';
import { EventTable } from 'types/supabase';
import EventInformation from './EventInformation';
import { PlaceType } from './types';
import Layout from 'src/components/layout/Layout';
import { Has } from 'src/hooks/useGrants';

const EventInformationProvider = () => {
  const { selectedEventId } = useParams();
  const { user } = useGrants();
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
      <Has perm={["event.edit", "event.cancel", "event.delete"]} any>
        <>
          <IconButton sx={{ color: 'primary.contrastText', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Has perm={"event.edit"}>
              <MenuItem
                onClick={async () => {
                  setAnchorEl(null)
                  const result = await dialogs.open(EditEventOptionsDialog);
                  if (result) {
                    await dialogs.open(CreateOrUpdateEventDialog, {
                      event: {
                        ...event,
                        items_enabled: false,
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
            </Has>
            <Has perm={"event.cancel"}>
              <MenuItem
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
            </Has>
            <Has perm={"event.delete"}>
              <MenuItem
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
            </Has>
          </Menu>
        </>
      </Has>
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
