import { AccessTime, Article, Close, FiberManualRecord, Map } from '@mui/icons-material';
import EventIcon from '@mui/icons-material/Event';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { DatePicker, DateTimePicker } from '@mui/x-date-pickers';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DialogProps, useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import { format, isAfter, set } from 'date-fns';
import _ from 'lodash';
import React, { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useFetchMode } from 'src/hooks/useFetchMode';
import { useInsertEventMutation, useUpdateRecurrenceMutation, useUpdateSingleMutation } from 'src/tanstack/events';
import { dayjsFromDb, formatDateToDatabase } from 'src/utils';
import { EventTable } from 'types/supabase';
import { NumberInput } from '../../../components/mui/NumberInput';
import { Enums, TablesInsert, TablesUpdate } from '../../../types/supabase-generated.types';
import { CreateEventOption, PlaceType } from '../types';
import SearchPlacesDialog from './SearchPlacesDialog';
import { SelectGroupDialog } from './SelectGroupDialog';

const emptyEvent = {
  title: '',
  description: '',
  startingDateTime: formatDateToDatabase(set(new Date(), { seconds: 0, milliseconds: 0 })),
  meetingDateTime: null,
  endDateTime: formatDateToDatabase(set(new Date(), { seconds: 0, milliseconds: 0 })),
  recurrence: 'None',
  maxAttendees: null,
  required_item: null,
  answerDeadline: null,
  place: null
} as EventTable;

type CreateEventProps = {
  event?: EventTable | null;
  eventGroup?: Group | null;
  option: CreateEventOption;
};

export const CreateOrUpdateEventDialog = ({ payload: { event, eventGroup, option }, open, onClose }: DialogProps<CreateEventProps>) => {
  const notifications = useNotifications();
  const [fetchMode] = useFetchMode();
  const dialogs = useDialogs();
  const { t } = useTranslation();
  const [editedEvent, setEditedEvent] = useState<EventTable>(event ?? emptyEvent);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(eventGroup ?? null);
  const [dialogOpen, setDialogOpen] = useState<'group' | 'stopRepeat' | 'repeat' | 'places' | null>(null);
  const [place, setPlace] = useState<PlaceType | null>(event?.place ? JSON.parse(event.place) as PlaceType : null);

  const ref = useRef<HTMLFormElement>(null);

  const insertEvent = useInsertEventMutation(fetchMode);
  const updateSingleEvent = useUpdateSingleMutation(fetchMode);
  const updateRecurrenceEvents = useUpdateRecurrenceMutation(fetchMode);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {

      if (!editedEvent.meetingDateTime)
        setEditedEvent({ ...editedEvent, meetingDateTime: editedEvent.startingDateTime });

      let edited_event = _.omit(editedEvent, ['fullGroup', 'attendance', 'comments', 'userAttendance', 'attendanceUpdating']) as TablesInsert<"events">;

      const changes = _.differenceWith(_.toPairs(edited_event), _.toPairs(_.pick(event ?? {}, Object.keys(event ?? {}))), _.isEqual);
      const eventChanges = _.fromPairs(changes) as TablesUpdate<"events">

      console.log("Event changes", edited_event.id, eventChanges)

      if (!edited_event.startingDateTime) throw new Error(t('events.creation.startDateCannotBeNull'));

      if (!edited_event.group) throw new Error(t('events.creation.noGroupSelected'));

      if (edited_event.answerDeadline && isAfter(edited_event.answerDeadline, edited_event.startingDateTime))
        throw new Error(t('events.creation.answerDeadlineAfterStart'));

      if (!edited_event.title || edited_event.title.length < 6) throw new Error(t('events.creation.titleTooShort'));

      if (!edited_event.description || edited_event.description.length < 1) throw new Error(t('events.creation.descriptionEmpty'));

      if (edited_event.meetingDateTime)
        if (isAfter(edited_event.meetingDateTime, edited_event.startingDateTime))
          throw new Error(t('events.creation.meetingTimeBeforeStartTime'));

      if (option === 'InsertEvent') {
        insertEvent.mutate({ event: eventChanges as TablesInsert<"events"> }, {
          onError: (error) =>
            notifications.show("Event konnte nicht erstellt werden: " + error.message, { severity: "error" }),
          onSuccess: () => onClose()
        })
      } else if (option === 'UpdateSingle') {
        updateSingleEvent.mutate({ eventChanges, id: edited_event.id ?? '' }, {
          onError: (error) =>
            notifications.show("Event konnte nicht aktualisiert werden: " + error.message, { severity: "error" }),
          onSuccess: () => onClose()
        })
      } else if (option === 'UpdateRecurrence') {
        updateRecurrenceEvents.mutate({ eventChanges, key: editedEvent.key, startingDateTime: editedEvent.startingDateTime }, {
          onError: (error) =>
            notifications.show("Events konnten nicht aktualisiert werden: " + error.message, { severity: "error" }),
          onSuccess: () => onClose()
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
      notifications.show(message, { severity: "error" })
    }
  };

  function SetViewOnClick({ place }: { place: PlaceType }) {
    const map = useMap();
    map.setView({ lat: place.lat, lng: place.lon }, map.getZoom());

    return null;
  }

  return (
    <Dialog fullScreen open={open} onClose={() => onClose()}>
      <AppBar sx={{ position: 'sticky', pt: "env(safe-area-inset-top)" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => onClose()}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {`Event ${event ? 'bearbeiten' : 'erstellen'}`}
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
      <Box ref={ref} component="form" onSubmit={handleSubmit} noValidate>
        <List>
          <ListItem sx={{ pt: 0, pb: 0 }} key={'title'}>
            <TextField
              fullWidth
              variant="standard"
              label="Event-Titel"
              value={editedEvent.title}
              onChange={e => setEditedEvent({ ...editedEvent, title: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventIcon />
                  </InputAdornment>
                ),
              }}
              margin="normal"
            />
          </ListItem>
          <ListItem sx={{ pt: 0, pb: 0 }} key={'eventDescription'}>
            <TextField
              fullWidth
              multiline
              value={editedEvent.description}
              onChange={e => setEditedEvent({ ...editedEvent, description: e.target.value })}
              variant="standard"
              label="Beschreibung"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Article />
                  </InputAdornment>
                ),
              }}
              margin="normal"
            />
          </ListItem>

          <ListItemButton onClick={async () => {
            const result = await dialogs.open(SelectGroupDialog);
            if (result) {
              setSelectedGroup(result);
              setEditedEvent({
                ...editedEvent,
                group: result.id
              })
            }
          }} key={'group'}>
            <ListItemAvatar>
              {selectedGroup && <FiberManualRecord sx={{ color: selectedGroup.color }} />}
            </ListItemAvatar>
            <ListItemText
              primary={selectedGroup?.name ?? 'Keine Gruppe gewählt'}
              secondary={selectedGroup?.description}
            />
          </ListItemButton>

          <Divider sx={{ mb: 2, mt: 2 }} />

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'startDate'}>
            <ListItemAvatar>
              <AccessTime />
            </ListItemAvatar>

            <DatePicker
              sx={{ width: '100%' }}
              label="Datum"
              disablePast
              format="DD MMMM YYYY"
              onChange={(val) =>
                setEditedEvent({
                  ...editedEvent,
                  startingDateTime: formatDateToDatabase(
                    set(new Date(editedEvent.startingDateTime), {
                      date: val?.date(),
                      year: val?.year(),
                      month: val?.month(),
                      seconds: 0,
                      milliseconds: 0,
                    })
                  ),
                })
              }
              value={dayjsFromDb(editedEvent.startingDateTime)}
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'startTime'}>
            <ListItemAvatar />

            <TimePicker
              sx={{ width: '100%' }}
              views={['hours', 'minutes']}
              ampm={false}
              label="Startzeit"
              onChange={(val) =>
                setEditedEvent({
                  ...editedEvent,
                  startingDateTime: formatDateToDatabase(
                    set(new Date(editedEvent.startingDateTime), {
                      hours: val?.hour(),
                      minutes: val?.minute(),
                      seconds: 0,
                      milliseconds: 0
                    })
                  ),
                })
              }
              value={dayjsFromDb(editedEvent.startingDateTime)}
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'meetingTime'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={editedEvent.meetingDateTime !== null}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    meetingDateTime: editedEvent.meetingDateTime !== null ? null : formatDateToDatabase(new Date()),
                  })
                }
              />
            </ListItemAvatar>

            <TimePicker
              slotProps={{ textField: { error: false } }}
              disabled={editedEvent.meetingDateTime === null}
              sx={{ width: '100%' }}
              views={['hours', 'minutes']}
              ampm={false}
              maxTime={dayjsFromDb(editedEvent.startingDateTime)}
              label="Treffpunkt"
              onChange={(val) =>
                setEditedEvent({
                  ...editedEvent,
                  meetingDateTime: formatDateToDatabase(
                    set(new Date(editedEvent.startingDateTime), {
                      hours: val?.hour(),
                      minutes: val?.minute(),
                      seconds: 0,
                      milliseconds: 0,
                    })
                  ),
                })
              }
              value={editedEvent.meetingDateTime ? dayjsFromDb(editedEvent.meetingDateTime) : null}
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'endDateTime'}>

            <DateTimePicker
              slotProps={{ textField: { error: false } }}
              disabled={editedEvent.endDateTime === null}
              sx={{ width: '100%' }}
              views={['year', 'month', 'day', 'hours', 'minutes']}
              format={'DD MMMM YYYY HH:mm'}
              ampm={false}
              minDateTime={dayjsFromDb(editedEvent.startingDateTime)}
              label="Ende"
              onChange={(val) =>
                setEditedEvent({
                  ...editedEvent,
                  endDateTime: formatDateToDatabase(
                    set(new Date(), {
                      year: val?.year(),
                      month: val?.month(),
                      date: val?.date(),
                      hours: val?.hour(),
                      minutes: val?.minute(),
                      seconds: 0,
                      milliseconds: 0,
                    })
                  ),
                })
              }
              value={dayjsFromDb(editedEvent.endDateTime)}
            />
          </ListItem>

          <ListItem onClick={() => setDialogOpen('places')} key={'searchPlace'}>
            <ListItemAvatar>
              <Map />
            </ListItemAvatar>

            <ListItemText primary={place?.name ?? 'Nothing selected'} />
          </ListItem>
          <ListItem
            sx={{ '&.MuiListItem-root': { pb: 1, pt: 0 } }}
            onClick={() => setDialogOpen('places')}
            key={'searchPlaceMap'}
          >
            <ListItemAvatar></ListItemAvatar>
            {
              place && <ListItemText>
                <Box sx={{ width: '100%', height: '150px' }}>
                  <MapContainer
                    center={[place.lat, place.lon]}
                    zoom={15}
                    dragging={false}
                    doubleClickZoom={false}
                    scrollWheelZoom={false}
                    attributionControl={false}
                    zoomControl={false}
                    style={{ width: '100%', height: '150px', borderRadius: '16px' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <SetViewOnClick place={place} />
                    <Marker position={[place.lat, place.lon]} interactive={false} />
                  </MapContainer>
                </Box>
              </ListItemText>
            }
          </ListItem>

          <Divider />

          <ListItem onClick={() => setDialogOpen('repeat')} key={'recurrence'}>
            <ListItemAvatar>
              <EventRepeatIcon />
            </ListItemAvatar>
            <ListItemText primary={'Wiederholung'} secondary={editedEvent.recurrence} />
          </ListItem>

          <ListItem onClick={() => setDialogOpen('stopRepeat')} key={'stopRecurrence'}>
            <ListItemAvatar />
            <ListItemText
              primary={'Wiederholung stoppen'}
              secondary={!editedEvent.recurrenceEnd ? 'Niemals' : format(editedEvent.recurrenceEnd, 'dd MMM yyyy')}
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'answerDeadline'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={editedEvent.answerDeadline !== null}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    answerDeadline: editedEvent.answerDeadline
                      ? null
                      : formatDateToDatabase(
                        set(Date.now(), {
                          seconds: 0,
                          milliseconds: 0,
                        })
                      ),
                  })
                }
              />
            </ListItemAvatar>

            <DateTimePicker
              slotProps={{ textField: { error: false } }}
              disabled={editedEvent.answerDeadline === null}
              sx={{ width: '100%' }}
              label="Answer deadline"
              disablePast
              ampm={false}
              format={'DD MMMM YYYY HH:mm'}
              onChange={(val) =>
                setEditedEvent({
                  ...editedEvent,
                  answerDeadline: formatDateToDatabase(
                    set(new Date(editedEvent.answerDeadline ?? ''), {
                      date: val?.date(),
                      month: val?.month(),
                      year: val?.year(),
                      hours: val?.hour(),
                      minutes: val?.minute(),
                      seconds: 0,
                      milliseconds: 0,
                    })
                  ),
                })
              }
              value={editedEvent.answerDeadline ? dayjsFromDb(editedEvent.answerDeadline) : null}
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'maxAttendees'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={editedEvent.maxAttendees !== null}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    maxAttendees: editedEvent.maxAttendees === null ? 0 : null,
                  })
                }
              />
            </ListItemAvatar>

            <NumberInput
              fullWidth
              disabled={editedEvent.maxAttendees === null}
              value={editedEvent.maxAttendees}
              onChange={(event, val) => {
                if (event.type === 'click' && val && val >= 0)
                  setEditedEvent({ ...editedEvent, maxAttendees: val ?? 0 });
              }}
              placeholder="Maximale Teilnehmerzahl"
            />
          </ListItem>

          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'itemType'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={editedEvent.required_item !== null}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    required_item: editedEvent.required_item === null ? 'mtvStorage' : null,
                  })
                }
              />
            </ListItemAvatar>
            <Select
              label={'Benötigter Schlüssel'}
              disabled={editedEvent.required_item === null}
              fullWidth
              value={editedEvent.required_item ?? 'none'}
              onChange={(e) => {
                if (e.target.value === 'none') setEditedEvent({ ...editedEvent, required_item: null });
                else setEditedEvent({ ...editedEvent, required_item: e.target.value as Enums<'ItemType'> });
              }}
            >
              <MenuItem value={'goethe'}>Goethe Schlüssel</MenuItem>
              <MenuItem value={'mtvStorage'}>MTV Kellerschlüssel</MenuItem>
              <MenuItem value={'mtvGym'}>MTV Gymschlüssel</MenuItem>
              <MenuItem value={'mtvGymPalazzo'}>MTV Gym/Palazzoschlüssel</MenuItem>
              <MenuItem value={'none'}>Keiner</MenuItem>
            </Select>
          </ListItem>
          <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'itemType'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={editedEvent.constellations_enabled}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    constellations_enabled: !editedEvent.constellations_enabled,
                  })
                }
              />
            </ListItemAvatar>
            <ListItemText primary={"Konstellationen aktiviert"} secondary={"Soll es möglich sein für Trainer, Konstellationen zu erstellen?"} />
          </ListItem>
        </List>
      </Box>
      <Dialog open={dialogOpen === 'repeat'} onClose={() => setDialogOpen(null)}>
        <DialogTitle>Wiederholung</DialogTitle>
        <DialogContent>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <RadioGroup
              aria-labelledby="demo-radio-buttons-group-label"
              value={editedEvent.recurrence}
              onChange={(e) => {
                setEditedEvent({ ...editedEvent, recurrence: e.target.value as EventRecurrence });
                setDialogOpen(null);
              }}
              name="radio-buttons-group"
            >
              {Array.from<{ value: EventRecurrence; label: string }>([
                { value: 'None', label: 'Gar nicht' },
                { value: 'Weekly', label: 'Wöchentlich' },
                { value: 'Fortnightly', label: 'Alle 2 Wochen' },
                { value: 'Monthly', label: 'Monatlich' },
              ]).map((item) => (
                <FormControlLabel value={item.value} control={<Radio />} label={item.label} key={item.value} />
              ))}
            </RadioGroup>
          </FormControl>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen === 'stopRepeat'} onClose={() => setDialogOpen(null)}>
        <DialogTitle>Wiederholung</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={editedEvent.recurrenceEnd === null}
                onChange={() =>
                  setEditedEvent({
                    ...editedEvent,
                    recurrenceEnd: editedEvent.recurrenceEnd
                      ? null
                      : formatDateToDatabase(
                        set(Date.now(), {
                          seconds: 0,
                          milliseconds: 0,
                        })
                      ),
                  })
                }
              />
            }
            label="Niemals"
          />

          <DatePicker
            sx={{ mt: 2, mb: 2, width: '100%' }}
            label="Start"
            disabled={editedEvent.recurrenceEnd === null}
            onChange={(val) =>
              setEditedEvent({
                ...editedEvent,
                recurrenceEnd: formatDateToDatabase(
                  set(editedEvent.recurrenceEnd ? new Date(editedEvent.recurrenceEnd) : Date.now(), {
                    date: val?.date(),
                    month: val?.month(),
                    year: val?.year(),
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    milliseconds: 0,
                  })
                ),
              })
            }
            value={editedEvent.recurrenceEnd ? dayjsFromDb(editedEvent.recurrenceEnd) : null}
          />

          <Typography>Es werden Termine erstellt bis einschließlich diesem Tag. Alles danach entfällt</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(null)}>Bestätigen</Button>
        </DialogActions>
      </Dialog>

      <SearchPlacesDialog
        open={dialogOpen === 'places'}
        handleClose={() => setDialogOpen(null)}
        placeSelected={(place) => {
          console.log("Place selected", place)
          setPlace(place)
          setEditedEvent({
            ...editedEvent,
            place: JSON.stringify({
              name: place.name,
              lat: place.lat,
              lon: place.lon
            })
          });
          setDialogOpen(null);
        }}
      />
    </Dialog>
  );
};
