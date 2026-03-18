import DurationAdder from '@/components/DurationInput';
import { useDeleteEventTransformation, useEventTransformation, useUpsertEventTransformation } from '@/tanstack/events';
import { useGroups } from '@/tanstack/groups';
import { EventsUserView, GroupWithUserMappings } from '@/types/supabaseTypes';
import { postgresIntervalToDuration } from '@/utils';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Group from '@mui/icons-material/Group';
import Remove from '@mui/icons-material/Remove';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Checkbox from '@mui/material/Checkbox';
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
import { DialogProps, useDialogs, useNotifications } from '@toolpad/core';
import { differenceInCalendarDays, Duration, format, sub } from 'date-fns';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectGroupDialog } from './SelectGroupDialog';

export type TransformationTrigger = {
  attending_lt?: number;
};

export const TransformEventDialog = ({
  payload: { event, user },
  open,
  onClose,
}: DialogProps<{ event: EventsUserView; user: User }, 'success' | 'failure'>) => {
  const { data = null, isLoading, error } = useEventTransformation(event.key, open);

  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useGroups();

  if (isLoading || groupsLoading) return <div>Lädt…</div>;
  if (error || groupsError) return <div>Fehler</div>;

  return <Content event={event} user={user} groups={groups} initialData={data} open={open} onClose={onClose} />;
};

type EventTransformationNext = {
  title?: string;
  description?: string;
  group?: string;
  disableAnswerDeadline?: boolean;
};

function isNextObject(next: unknown): next is EventTransformationNext {
  return typeof next === 'object' && next !== null && !Array.isArray(next);
}

const toIntervalString = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

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
  onClose: (value: 'success' | 'failure') => void;
  groups: GroupWithUserMappings[];
}) => {
  const [leadTime, setLeadTime] = useState<Duration>(() =>
    postgresIntervalToDuration(toIntervalString(initialData?.lead_time))
  );
  const [newTitle, setNewTitle] = useState<string>(() => {
    const next = initialData?.next;

    if (isNextObject(next) && typeof next.title === 'string') {
      return next.title;
    }

    return event.title;
  });
  const [newDescription, setNewDescription] = useState<string>(() => {
    const next = initialData?.next;

    if (isNextObject(next) && typeof next.description === 'string') {
      return next.description;
    }

    return event.description;
  });
  const [newGroup, setNewGroup] = useState<Group | null>(() => {
    const next = initialData?.next;
    let groupId;
    if (isNextObject(next) && typeof next.group === 'string') {
      groupId = next.group;
    } else {
      groupId = event.group?.id;
    }

    return groups.find((x) => x.id === groupId) ?? null;
  });
  const [disableAnswerDeadline, setDisableAnswerDeadline] = useState<boolean>(() => {
    const next = initialData?.next;

    if (isNextObject(next) && typeof next.disableAnswerDeadline === 'boolean') {
      return next.disableAnswerDeadline;
    }

    return false;
  });
  const [oneTime, setOneTime] = useState<boolean>(initialData?.one_time ?? true);
  const [trigger, setTrigger] = useState<TransformationTrigger>((initialData?.trigger as TransformationTrigger) ?? {});

  const dialogs = useDialogs();
  const notifications = useNotifications();

  const ref = useRef<HTMLFormElement>(null);
  const { t } = useTranslation();

  const mutation = useUpsertEventTransformation();
  const deleteMutation = useDeleteEventTransformation();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!newGroup) {
        throw new Error('Es wurde keine Gruppe ausgewählt.');
      }
      if (!newTitle || newTitle.length < 6) throw new Error(t('events.creation.titleTooShort'));

      if (!newDescription || newDescription.length < 1) throw new Error(t('events.creation.descriptionEmpty'));

      mutation.mutate(
        {
          eventKey: event.key,
          userId: user.id,
          leadTime,
          newTitle,
          newDescription,
          newGroupId: newGroup.id,
          trigger: trigger,
          disableAnswerDeadline,
          oneTime,
        },
        {
          onError: (error) => {
            const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
            notifications.show(message, { severity: 'error' });
          },
          onSuccess: () => {
            notifications.show('Die Eventreihe wurde erfolgreich transformiert.', { severity: 'success' });
            onClose('success');
          },
        }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
      notifications.show(message, { severity: 'error' });
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose('failure')}>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose('failure')}>
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
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Event-Titel
        </Typography>
        <ListItem dense sx={{ pt: 0, pb: 0, mb: 2 }} key={'title2'}>
          <TextField size="small" fullWidth value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        </ListItem>
        <Divider />
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Event-Beschreibung
        </Typography>
        <ListItem dense sx={{ pt: 0, pb: 0, mb: 1 }} key={'eventDescription2'}>
          <TextField
            size="small"
            fullWidth
            multiline
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            label="Beschreibung"
          />
        </ListItem>
        <Divider />
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Event-Gruppe
        </Typography>
        <ListItemButton
          dense
          sx={{ py: 0, mb: 1 }}
          onClick={async () => {
            const result = await dialogs.open(SelectGroupDialog);
            if (result) {
              setNewGroup(result);
            }
          }}
          key={'group2'}
        >
          <ListItemAvatar>{newGroup && <Group sx={{ color: newGroup.color }} />}</ListItemAvatar>
          <ListItemText primary={newGroup?.name ?? 'Keine Gruppe gewählt'} secondary={newGroup?.description} />
        </ListItemButton>
        <Divider />
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Anmelden Deadline entfernen?
        </Typography>
        <ListItem sx={{ py: 0, mb: 2 }} key={'answerDeadline'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={disableAnswerDeadline}
              onChange={() => setDisableAnswerDeadline(!disableAnswerDeadline)}
            />
          </ListItemAvatar>

          <ListItemText primary={'Anmelde Deadline entfernen?'} />
        </ListItem>
        <Divider />
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Einmalige Ausführung?
        </Typography>
        <ListItem sx={{ py: 0, mb: 2 }} key={'justOnce'}>
          <ListItemAvatar>
            <Checkbox sx={{ pl: 0 }} checked={oneTime} onChange={(e) => setOneTime(e.target.checked)} />
          </ListItemAvatar>

          <ListItemText primary={'Einmalige Ausführung?'} />
        </ListItem>
        <Divider />
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Bedingung
        </Typography>
        <ListItem
          dense
          sx={{ pt: 0, pb: 0, mb: 2 }}
          key={'triggerAttendees'}
          secondaryAction={
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <IconButton
                disableRipple
                onClick={(event) => {
                  if (trigger.attending_lt && trigger.attending_lt > 0) {
                    setTrigger({
                      ...trigger,
                      attending_lt: trigger.attending_lt - 1,
                    });
                  }
                  event.stopPropagation();
                }}
              >
                <Remove fontSize="inherit" sx={{ fontSize: '22px' }} />
              </IconButton>
              <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>
                {trigger.attending_lt ?? 0}
              </Typography>
              <IconButton
                disableRipple
                onClick={(event) => {
                  setTrigger({
                    ...trigger,
                    attending_lt: (trigger.attending_lt ?? 0) + 1,
                  });
                  event.stopPropagation();
                }}
              >
                <Add fontSize="inherit" sx={{ fontSize: '22px' }} />
              </IconButton>
            </Box>
          }
        >
          <ListItemText primary={'Teilnehmer weniger als'} />
        </ListItem>
        <Divider />
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary" gutterBottom>
          Löschen
        </Typography>
        <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, m: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={() =>
                dialogs.confirm('Wirklich löschen?').then((result) => {
                  if (result) {
                    deleteMutation.mutate({ eventKey: event.key }, {
                      onError: (error) => {
                        const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
                        notifications.show(message, { severity: 'error' });
                      },
                      onSuccess: () => {
                        notifications.show('Die Eventreihe wurde erfolgreich gelöscht.', { severity: 'success' });
                        onClose('success');
                      }
                    });
                  }
                })
              }
            >
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Delete />
              </ListItemAvatar>
              <ListItemText primary="Löschen" />
            </ListItem>
          </CardActionArea>
        </Card>
      </Box>
    </Dialog>
  );
};
