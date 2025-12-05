import DurationAdder from '@/components/DurationInput';
import { supabase } from '@/lib/supabase';
import { useGroups } from '@/tanstack/groups';
import { EventsUserView, GroupWithUserMappings } from '@/types/supabaseTypes';
import { durationToPostgresInterval } from '@/utils';
import Article from '@mui/icons-material/Article';
import Close from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import Group from '@mui/icons-material/Group';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/system/Box';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DialogProps, useDialogs, useNotifications } from '@toolpad/core';
import { differenceInCalendarDays, Duration, format, sub } from 'date-fns';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectGroupDialog } from './SelectGroupDialog';

export const TransformEventDialog = ({
  payload: { event, user },
  open,
  onClose,
}: DialogProps<{ event: EventsUserView; user: User }>) => {
  const {
    data = null,
    isLoading,
    error,
  } = useQuery<EventTransformation | null>({
    queryKey: ['eventTransformation', event.key],
    enabled: open,
    queryFn: async () => {
      const result = await supabase
        .schema('public')
        .from('event_transformations')
        .select('*')
        .eq('event_key', event.key)
        .maybeSingle();
      return result.data;
    },
  });

  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useGroups();

  if (isLoading || groupsLoading) return <div>Lädt…</div>;
  if (error || groupsError) return <div>Fehler</div>;

  return <Content event={event} user={user} groups={groups} initialData={data} open={open} onClose={() => onClose()} />;
};

const Content = ({
  event,
  user,
  initialData,
  groups,
  open,
  onClose,
}: {
  event: EventsUserView;
  user: User;
  initialData: EventTransformation | null;
  open: boolean;
  onClose: () => void;
  groups: GroupWithUserMappings[];
}) => {
  const [leadTime, setLeadTime] = useState<Duration>({ hours: 18 });
  const [newTitle, setNewTitle] = useState<string>(
    initialData?.next ? (JSON.parse(initialData.next.toString()).title ?? event.title) : event.title
  );
  const [newDescription, setNewDescription] = useState<string>(
    initialData?.next ? (JSON.parse(initialData.next.toString()).description ?? event.description) : event.description
  );
  const [newGroup, setNewGroup] = useState<Group | null>(
    groups.find(
      (x) => x.id === (initialData?.next ? JSON.parse(initialData.next.toString()).group : event.group?.id)
    ) ?? null
  );
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const ref = useRef<HTMLFormElement>(null);
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: async (payload: {
      eventKey: string;
      userId: string;
      leadTime: Duration;
      newTitle: string;
      newDescription: string;
      newGroupId: string | null;
    }) => {
      const result = await supabase
        .schema('public')
        .from('event_transformations')
        .upsert({
          event_key: payload.eventKey,
          created_by: payload.userId,
          lead_time: durationToPostgresInterval(payload.leadTime),
          next: JSON.stringify({
            title: payload.newTitle,
            description: payload.newDescription,
            group: payload.newGroupId,
          }),
          one_time: true,
          active: true,

          trigger: '{}',
        })
        .select('*')
        .single();

      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      notifications.show('Die Eventreihe wurde erfolgreich transformiert.', { severity: 'success' });
      onClose();
    },
    onError: (error) => {
      notifications.show(`Fehler beim Transformieren der Eventreihe: ${error.message}`, { severity: 'error' });
    },
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!newGroup) {
        throw new Error('Es wurde keine Gruppe ausgewählt.');
      }
      if (!newTitle || newTitle.length < 6) throw new Error(t('events.creation.titleTooShort'));

      if (!newDescription || newDescription.length < 1) throw new Error(t('events.creation.descriptionEmpty'));

      mutation.mutate({
        eventKey: event.key,
        userId: user.id,
        leadTime,
        newTitle,
        newDescription,
        newGroupId: newGroup.id,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
      notifications.show(message, { severity: 'error' });
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose()}>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose()}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {`Eventreihe transformieren`}
          </Typography>
          <Button
            autoFocus
            color="inherit"
            onClick={() => {
              if (ref.current) ref.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }}
          >
            Speichern
          </Button>
        </Toolbar>
      </AppBar>
      <Box ref={ref} sx={{ pt: 2 }} component="form" onSubmit={handleSubmit} noValidate>
        <ListItem dense key={'leadTime'}>
          <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
            <TimelapseIcon />
          </ListItemAvatar>
          <DurationAdder
            duration={leadTime}
            label="Eventänderung"
            durationChanged={(d) => {
              setLeadTime(d);
            }}
          />
        </ListItem>
        <ListItem dense key={'leadTimeOfEventSeries'}>
          <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}></ListItemAvatar>
          <ListItemText
            primary={
              t('date-fns.diffInDaysPrior', {
                count: differenceInCalendarDays(event.startingDateTime, sub(event.startingDateTime, leadTime)),
              }) + format(sub(event.startingDateTime, leadTime), " 'um' HH:mm")
            }
            secondary={'Zu dieser Uhrzeit wird das Event geändert'}
          />
        </ListItem>
        <Divider sx={{ mb: 2 }} />
        <ListItem dense sx={{ pt: 0, pb: 0, mb: 2 }} key={'title'}>
          <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
            <EventIcon />
          </ListItemAvatar>
          <TextField
            size="small"
            fullWidth
            label="Event-Titel"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </ListItem>
        <ListItem dense sx={{ pt: 0, pb: 0, mb: 2 }} key={'eventDescription'}>
          <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
            <Article />
          </ListItemAvatar>
          <TextField
            size="small"
            fullWidth
            multiline
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            label="Beschreibung"
          />
        </ListItem>
        <ListItemButton
          sx={{ py: 0, mb: 1 }}
          onClick={async () => {
            const result = await dialogs.open(SelectGroupDialog);
            if (result) {
              setNewGroup(result);
            }
          }}
          key={'group'}
        >
          <ListItemAvatar>{newGroup && <Group sx={{ color: newGroup.color }} />}</ListItemAvatar>
          <ListItemText primary={newGroup?.name ?? 'Keine Gruppe gewählt'} secondary={newGroup?.description} />
        </ListItemButton>
      </Box>
    </Dialog>
  );
};
