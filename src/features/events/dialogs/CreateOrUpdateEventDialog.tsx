import { useGrants } from '@/features/auth/GrantsContext';
import { useFetchMode } from '@/hooks/useFetchMode';
import { useInsertEventMutation, useUpdateRecurrenceMutation, useUpdateSingleMutation } from '@/tanstack/events';
import { formatDateFromDatabase, formatDateToDatabase, nameOfRecurrence } from '@/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { TimePicker } from '@/components/ui/time-picker';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { add, Duration, format, isAfter, set } from 'date-fns';
import { t } from 'i18next';
import { differenceWith, fromPairs, isEqual, toPairs } from 'lodash';
import { CalendarSync, CalendarX2, Map, Pencil, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EventTable } from 'types/supabase';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase-generated.types';
import { CreateEventOption, PlaceType } from '../types';
import SearchPlacesDialog from './SearchPlacesDialog';

const DEFAULT_DURATION: Duration = { hours: 2 };

const emptyEvent = {
  title: '',
  description: '',
  startingDateTime: formatDateToDatabase(set(new Date(), { seconds: 0, milliseconds: 0 })),
  meetingDateTime: null,
  endDateTime: formatDateToDatabase(add(set(new Date(), { seconds: 0, milliseconds: 0 }), DEFAULT_DURATION)),
  recurrence: 'None',
  maxAttendees: null,
  max_trial_attendees: null,
  required_item: null,
  answerDeadline: null,
  // answerStart: null,
  place: null,
} as EventTable;

type CreateEventProps = {
  event?: EventTable | null;
  eventGroup?: Group | null;
  option: CreateEventOption;
  items?: BringItems[];
};

const ITEMS: {
  value: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe" | null
  label: string
}[] = [
    {
      value: "mtvStorage",
      label: "MTV Keller"
    },
    {
      value: "mtvGym",
      label: "MTV Gym"
    },
    {
      value: "mtvGymPalazzo",
      label: "MTV Gym und Palazzo"
    },
    {
      value: "goethe",
      label: "Goethe Gymnasium"
    },
    {
      value: null,
      label: "Nichts gewählt"
    }
  ]

export const CreateOrUpdateEventDialog = ({
  payload: { event, eventGroup, option, items = [] },
  open,
  onClose,
}: DialogProps<CreateEventProps>) => {
  const [fetchMode] = useFetchMode();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [editedEvent, setEditedEvent] = useState<EventTable>(event ?? emptyEvent);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(eventGroup ?? null);
  const [bringItems, setBringItems] = useState(items);
  const ref = useRef<HTMLFormElement>(null);

  const place = useMemo(() => (editedEvent.place ? (JSON.parse(editedEvent.place) as PlaceType) : null), [editedEvent]);

  const insertEvent = useInsertEventMutation(fetchMode);
  const updateSingleEvent = useUpdateSingleMutation(fetchMode);
  const updateRecurrenceEvents = useUpdateRecurrenceMutation(fetchMode);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!editedEvent.meetingDateTime)
        setEditedEvent({ ...editedEvent, meetingDateTime: editedEvent.startingDateTime });

      const bring_items = bringItems.filter((x) => x.name && x.required_qty && x.required_qty > 0);

      setEditedEvent({ ...editedEvent, items_enabled: bring_items.length > 0 });

      const edited_event = editedEvent as TablesInsert<'events'>;

      const edited_event_pairs = toPairs(edited_event);
      const event_pairs = event ? toPairs(event) : [];

      const changes = differenceWith(edited_event_pairs, event_pairs, isEqual);

      const eventChanges = fromPairs(changes) as TablesUpdate<'events'>;

      if (!edited_event.startingDateTime) throw new Error(t('events.creation.startDateCannotBeNull'));

      if (!edited_event.group) throw new Error(t('events.creation.noGroupSelected'));

      if (edited_event.answerDeadline && isAfter(edited_event.answerDeadline, edited_event.startingDateTime))
        throw new Error(t('events.creation.answerDeadlineAfterStart'));

      if (!edited_event.title || edited_event.title.length < 6) throw new Error(t('events.creation.titleTooShort'));

      if (!edited_event.description || edited_event.description.length < 1)
        throw new Error(t('events.creation.descriptionEmpty'));

      if (edited_event.meetingDateTime)
        if (isAfter(edited_event.meetingDateTime, edited_event.startingDateTime))
          throw new Error(t('events.creation.meetingTimeBeforeStartTime'));

      if (option === 'InsertEvent') {
        insertEvent.mutate(
          {
            event: eventChanges as Tables<'events'>,
            currentUser: user,
            items: bring_items.map((x) => ({
              name: x.name,
              required_qty: x.required_qty ?? 0,
              unit: 'Stk.',
              sort_order: 0,
              notes: null,
            })),
          },
          {
            onError: (error) =>
              toast.error('Event konnte nicht erstellt werden: ' + error.message),
            onSuccess: () => {
              onClose();
            },
          }
        );
      } else if (option === 'UpdateSingle') {
        updateSingleEvent.mutate(
          { eventChanges, id: edited_event.id ?? '', currentUser: user },
          {
            onError: (error) =>
              toast.error('Event konnte nicht aktualisiert werden: ' + error.message),
            onSuccess: () => onClose(),
          }
        );
      } else if (option === 'UpdateRecurrence') {
        updateRecurrenceEvents.mutate(
          { eventChanges, key: editedEvent.key, startingDateTime: editedEvent.startingDateTime, currentUser: user },
          {
            onError: (error) =>
              toast.error('Events konnten nicht aktualisiert werden: ' + error.message),
            onSuccess: () => onClose(),
          }
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? (error as Error).message : 'Unknown error.';
      toast.error(message);
    }
  }

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogHeader variant={"appbar"}>
        <DialogTitle className={"flex-1"}>{`Event ${event ? 'bearbeiten' : 'erstellen'}`}</DialogTitle>
        <DialogClose render={<Button variant={"ghost"}>
          <X />
        </Button>} />
      </DialogHeader>
      <DialogBody className='p-0'>
        <form ref={ref} onSubmit={handleSubmit} noValidate className='flex flex-col gap-2'>
          <FieldSet className='p-2'>
            <Field className='gap-1'>
              <FieldLabel htmlFor='event-title'>Event-Titel</FieldLabel>
              <Input
                id="event-title"
                name="event-title"
                placeholder="Titel"
                className='w-full'
                value={editedEvent.title}
                onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                required
              />
            </Field>

            <Field className='gap-1'>
              <FieldLabel htmlFor='event-description'>Event-Beschreibung</FieldLabel>
              <Textarea
                id="event-description"
                name="event-description"
                placeholder="Beschreibung"
                className='w-full'
                value={editedEvent.description}
                onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                required
              />
            </Field>

            <Field className='gap-1'>
              <FieldLabel htmlFor='event-group'>Event-Gruppe</FieldLabel>
              <Item variant={"outline"} onClick={async () => {
                const result = await dialogs.selectGroup();
                if (result) {
                  setSelectedGroup(result);
                  setEditedEvent({
                    ...editedEvent,
                    group: result.id,
                  });
                }
              }}>
                <ItemTitle>
                  {
                    selectedGroup?.name ?? "Keine Gruppe gewählt"
                  }
                </ItemTitle>
              </Item>
            </Field>
          </FieldSet>

          <FieldSeparator />

          <FieldSet className='p-2'>
            <FieldLegend className='font-semibold'>Datum-und Uhrzeiten</FieldLegend>
            <FieldGroup className='flex-row'>
              <Field>
                <FieldLabel htmlFor="event-startdate">Startdatum</FieldLabel>
                <DatePicker
                  id='event-startdate'
                  placeholder='Datum'
                  onValueChange={(val) => {
                    if (!val) return;
                    setEditedEvent({
                      ...editedEvent,
                      startingDateTime: formatDateToDatabase(
                        set(new Date(editedEvent.startingDateTime), {
                          date: val.getDate(),
                          year: val.getFullYear(),
                          month: val.getMonth(),
                          seconds: 0,
                          milliseconds: 0,
                        })
                      ),
                    });
                  }}
                  value={formatDateFromDatabase(editedEvent.startingDateTime) ?? undefined} />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-starttime">Uhrzeit</FieldLabel>
                <TimePicker
                  id="event-starttime"
                  placeholder="12:30"
                  value={editedEvent?.startingDateTime ? new Date(editedEvent.startingDateTime) : undefined}
                  onValueChange={(newDate) => {
                    if (!newDate) return;

                    const dbFormattedDate = formatDateToDatabase(newDate);

                    setEditedEvent({
                      ...editedEvent,
                      startingDateTime: dbFormattedDate,
                    });
                  }}
                />
              </Field>
            </FieldGroup>

            <FieldGroup className='flex-row'>
              <Field>
                <FieldLabel htmlFor="event-enddate">Enddatum</FieldLabel>
                <DatePicker
                  id='event-enddate'
                  placeholder='Datum'
                  onValueChange={(val) => {
                    if (!val) return;
                    setEditedEvent({
                      ...editedEvent,
                      endDateTime: formatDateToDatabase(
                        set(new Date(editedEvent.endDateTime), {
                          date: val.getDate(),
                          year: val.getFullYear(),
                          month: val.getMonth(),
                          seconds: 0,
                          milliseconds: 0,
                        })
                      )
                    });
                  }}
                  value={formatDateFromDatabase(editedEvent.endDateTime) ?? undefined} />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-endtime">Uhrzeit</FieldLabel>
                <TimePicker
                  id="event-endtime"
                  placeholder="12:30"
                  value={editedEvent?.endDateTime ? new Date(editedEvent.endDateTime) : undefined}
                  onValueChange={(newDate) => {
                    if (!newDate) return;

                    setEditedEvent({
                      ...editedEvent,
                      endDateTime: formatDateToDatabase(set(editedEvent.endDateTime, {
                        hours: newDate.getHours(),
                        minutes: newDate.getMinutes()
                      })
                      )
                    });
                  }}
                />
              </Field>
            </FieldGroup>


            <FieldGroup className='flex-col gap-2'>
              <Field orientation="horizontal">
                <Checkbox
                  id="event-meetingdatetime-enabled"
                  checked={editedEvent.meetingDateTime !== null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newDate = new Date();
                      setEditedEvent({
                        ...editedEvent,
                        meetingDateTime: formatDateToDatabase(set(editedEvent.startingDateTime, {
                          hours: newDate.getHours(),
                          minutes: newDate.getMinutes()
                        })),
                      });
                    } else {
                      setEditedEvent({
                        ...editedEvent,
                        meetingDateTime: null
                      });
                    }
                  }}
                />
                <FieldLabel
                  htmlFor="event-meetingdatetime-enabled"
                  className="font-normal"
                >
                  Treffpunkt vor dem Training
                </FieldLabel>
              </Field>
              <Field className={cn("", {
                "hidden": editedEvent.meetingDateTime === null
              })}>
                <TimePicker
                  id="event-meetingdatetime"
                  placeholder="12:30"
                  value={editedEvent?.meetingDateTime ? new Date(editedEvent.meetingDateTime) : undefined}
                  onValueChange={(newDate) => {
                    if (!newDate) return;

                    setEditedEvent({
                      ...editedEvent,
                      meetingDateTime: formatDateToDatabase(set(editedEvent.startingDateTime, {
                        hours: newDate.getHours(),
                        minutes: newDate.getMinutes()
                      })),
                    });
                  }}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <FieldSet className='p-2'>
            <FieldLegend className='font-semibold'>Standort</FieldLegend>
            <Item variant={"outline"}>
              <ItemContent>
                {
                  place ? <>
                    <ItemTitle className='truncate'>{place.name}</ItemTitle>
                    <ItemDescription className='truncate'>{place?.description}</ItemDescription>
                  </>
                    : <ItemTitle>Kein Standort gewählt</ItemTitle>
                }
              </ItemContent>
              <ItemActions>
                {
                  place && <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                    const result = await dialogs.open(SearchPlacesDialog);
                    if (result) {
                      setEditedEvent({
                        ...editedEvent,
                        place: JSON.stringify({
                          name: result.name,
                          description: result.description,
                          lat: result.lat,
                          lon: result.lon,
                        }),
                      });
                    }
                  }}>
                    <Pencil />
                  </Button>
                }
                <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                  if (place !== null) {
                    setEditedEvent({ ...editedEvent, place: null })
                  } else {
                    const result = await dialogs.open(SearchPlacesDialog);
                    if (result) {
                      setEditedEvent({
                        ...editedEvent,
                        place: JSON.stringify({
                          name: result.name,
                          description: result.description,
                          lat: result.lat,
                          lon: result.lon,
                        }),
                      });
                    }
                  }
                }}>
                  {
                    place ? <Trash2 /> : <Map />
                  }
                </Button>
              </ItemActions>
            </Item>
          </FieldSet>

          <FieldSeparator />

          <FieldSet className='p-2'>
            <FieldLegend className='font-semibold'>Wiederholung</FieldLegend>

            <FieldLabel htmlFor="switch-notifications">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Wiederholung</FieldTitle>
                  <FieldDescription>
                    {nameOfRecurrence(editedEvent.recurrence)}
                  </FieldDescription>
                  {
                    editedEvent.recurrenceEnd && <FieldDescription>
                      Endet: {format(editedEvent.recurrenceEnd, "dd.MM.yyyy HH:mm")}
                    </FieldDescription>
                  }
                </FieldContent>
                <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                  const result = await dialogs.selectSingleOption<EventRecurrence>([
                    { value: 'None', label: 'Keine Wiederholung' },
                    { value: 'Weekly', label: 'Wöchentlich' },
                    { value: 'Fortnightly', label: 'Alle 2 Wochen' },
                    { value: 'Monthly', label: 'Monatlich' },
                  ], editedEvent.recurrence);
                  if (result) {
                    setEditedEvent({ ...editedEvent, recurrence: result, ...(result === "None" && { recurrenceEnd: null }) })
                  }
                }}>
                  <CalendarSync />
                </Button>
                <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                  const result = await dialogs.open(SelectRecurrenceEndDialog, formatDateFromDatabase(editedEvent.recurrenceEnd));
                  if (result && result !== "unset")
                    setEditedEvent({ ...editedEvent, recurrenceEnd: formatDateToDatabase(result) })
                  else if (result === 'unset')
                    setEditedEvent({ ...editedEvent, recurrenceEnd: null })

                }}>
                  <CalendarX2 />
                </Button>
              </Field>
            </FieldLabel>

          </FieldSet>

          <FieldSeparator />

          <FieldSet className='p-2'>
            <FieldLegend className='font-semibold'>Optionale Felder</FieldLegend>
            <FieldGroup className='flex flex-row items-end gap-4'>
              <Field className='flex-1'>
                <FieldLabel htmlFor="event-signupstartdate">Anmeldestart</FieldLabel>
                <DatePicker
                  id='event-signupstartdate'
                  placeholder='Datum'
                  className='w-full'
                  onValueChange={(val) => {
                    if (!val) return;
                    setEditedEvent({
                      ...editedEvent,
                      answerDeadline: formatDateToDatabase(
                        set(editedEvent.answerDeadline ? new Date(editedEvent.answerDeadline) : new Date(), {
                          date: val.getDate(),
                          year: val.getFullYear(),
                          month: val.getMonth(),
                          seconds: 0,
                          milliseconds: 0,
                        })
                      ),
                    });
                  }}
                  value={formatDateFromDatabase(editedEvent.answerDeadline) ?? undefined} />
              </Field>

              <Field className='w-24'>
                <FieldLabel htmlFor="event-signupstarttime" className='hidden'>Uhrzeit</FieldLabel>
                <TimePicker
                  id="event-signupstarttime"
                  className='!w-24'
                  placeholder="12:30"
                  value={editedEvent?.answerDeadline ? new Date(editedEvent.answerDeadline) : undefined}
                  onValueChange={(newDate) => {
                    if (!newDate) return;

                    const dbFormattedDate = formatDateToDatabase(newDate);

                    setEditedEvent({
                      ...editedEvent,
                      answerDeadline: dbFormattedDate,
                    });
                  }}
                />
              </Field>

              <Button className='flex-none min-w-0' variant={"outline"} onClick={() => {
                setEditedEvent({
                  ...editedEvent,
                  answerDeadline: null
                })
              }}>
                <Trash2 />
              </Button>
            </FieldGroup>

            <FieldLabel>
              <Field>
                <FieldLabel htmlFor="event-maxattendees">Maximale Teilnehmeranzahl</FieldLabel>
                <Field orientation={"horizontal"}>
                  <Input
                    type='number'
                    disabled={editedEvent.maxAttendees === null}
                    value={editedEvent.maxAttendees?.toFixed(0) ?? 0}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value);
                      if (Number.isNaN(parsed)) {
                        setEditedEvent({
                          ...editedEvent, maxAttendees: 0
                        })
                      } else {
                        setEditedEvent({
                          ...editedEvent,
                          maxAttendees: parsed < 0 ? 0 : parsed
                        })
                      }
                    }}
                  />
                  <Switch
                    checked={typeof editedEvent.maxAttendees === 'number'}
                    onCheckedChange={(val) => {
                      setEditedEvent({
                        ...editedEvent,
                        maxAttendees: val ? 0 : null
                      })
                    }}
                  />
                </Field>
              </Field>
            </FieldLabel>

            <Has feat={"events.trials"}>
              <FieldLabel>
                <Field>
                  <FieldLabel htmlFor="event-max_trial_attendees">Maximale Probeteilnehmer</FieldLabel>
                  <Field orientation={"horizontal"}>
                    <Input
                      type='number'
                      disabled={editedEvent.max_trial_attendees === null}
                      value={editedEvent.max_trial_attendees?.toFixed(0) ?? 0}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value);
                        if (Number.isNaN(parsed)) {
                          setEditedEvent({
                            ...editedEvent, max_trial_attendees: 0
                          })
                        } else {
                          setEditedEvent({
                            ...editedEvent,
                            max_trial_attendees: parsed < 0 ? 0 : parsed
                          })
                        }
                      }}
                    />
                    <Switch
                      checked={typeof editedEvent.max_trial_attendees === 'number'}
                      onCheckedChange={(val) => {
                        setEditedEvent({
                          ...editedEvent,
                          max_trial_attendees: val ? 0 : null
                        })
                      }}
                    />
                  </Field>
                </Field>
              </FieldLabel>
            </Has>

            <Has feat={"items"}>
              <FieldLabel>
                <Field>
                  <FieldLabel htmlFor="event-required-item">Benötigter Gegenstand</FieldLabel>
                  <Field orientation={"horizontal"}>
                    <Select items={ITEMS} value={editedEvent.required_item} onValueChange={(val) => setEditedEvent({
                      ...editedEvent,
                      required_item: val
                    })}>
                      <SelectTrigger className="w-full" disabled={editedEvent.required_item === null}>
                        <SelectValue placeholder={"Gegenstand auswählen"} />
                      </SelectTrigger>
                      <SelectContent>
                        {
                          ITEMS.map(x => (
                            <SelectItem key={x.value} value={x.value} >{x.label}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={typeof editedEvent.required_item === "string"}
                      onCheckedChange={(val) => {
                        setEditedEvent({
                          ...editedEvent,
                          required_item: val ? 'mtvGym' : null
                        })
                      }}
                    />
                  </Field>
                </Field>
              </FieldLabel>
            </Has>

            <Has feat={"games"}>
              <FieldLabel>
                <Field orientation={"horizontal"}>
                  <FieldContent className='w-full'>
                    <FieldLabel>
                      Konstellationen aktiviert
                    </FieldLabel>
                    <FieldDescription>
                      Soll es möglich sein für Trainer, Konstellationen zu erstellen?
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id='event-constellations_enabled'
                    checked={editedEvent.constellations_enabled}
                    onCheckedChange={(val) => {
                      setEditedEvent({
                        ...editedEvent,
                        constellations_enabled: val
                      })
                    }}
                  />
                </Field>
              </FieldLabel>
            </Has>

            <FieldLabel>
              <Field orientation={"horizontal"}>
                <FieldContent className='w-full'>
                  <FieldLabel>
                    Gegenstände mitbringen
                  </FieldLabel>
                  <FieldDescription>
                    {
                      bringItems.map((x) => (
                        <Badge key={x.id}>{`${x.required_qty}x ${x.name}`}</Badge>
                      ))
                    }
                  </FieldDescription>
                </FieldContent>
                <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                  const result = await dialogs.open(PledgesDialog, {
                    bringItems: bringItems,
                    eventId: editedEvent.id,
                    user: user
                  });
                  setBringItems(result ?? [])
                }}>
                  <Pencil />
                </Button>
              </Field>
            </FieldLabel>
          </FieldSet>
        </form>
      </DialogBody>
      <DialogFooter variant={"fullscreen"}>
        <Button
          onClick={() => {
            if (ref.current) ref.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }}
        >
          Speichern
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog >


  //     <Dialog open={dialogOpen === 'repeat'} onClose={() => setDialogOpen(null)}>
  //       <DialogTitle>Wiederholung</DialogTitle>
  //       <DialogContent>
  //         <FormControl sx={{ m: 1, minWidth: 120 }}>
  //           <RadioGroup
  //             aria-labelledby="demo-radio-buttons-group-label"
  //             value={editedEvent.recurrence}
  //             onChange={(e) => {
  //               setEditedEvent({ ...editedEvent, recurrence: e.target.value as EventRecurrence });
  //               setDialogOpen(null);
  //             }}
  //             name="radio-buttons-group"
  //           >
  //             {Array.from<{ value: EventRecurrence; label: string }>([
  //               { value: 'None', label: 'Gar nicht' },
  //               { value: 'Weekly', label: 'Wöchentlich' },
  //               { value: 'Fortnightly', label: 'Alle 2 Wochen' },
  //               { value: 'Monthly', label: 'Monatlich' },
  //             ]).map((item) => (
  //               <FormControlLabel value={item.value} control={<Radio />} label={item.label} key={item.value} />
  //             ))}
  //           </RadioGroup>
  //         </FormControl>
  //       </DialogContent>
  //     </Dialog>

  //     <Dialog open={dialogOpen === 'stopRepeat'} onClose={() => setDialogOpen(null)}>
  //       <DialogTitle>Wiederholung</DialogTitle>
  //       <DialogContent>
  //         <FormControlLabel
  //           control={
  //             <Checkbox
  //               checked={editedEvent.recurrenceEnd === null}
  //               onChange={() =>
  //                 setEditedEvent({
  //                   ...editedEvent,
  //                   recurrenceEnd: editedEvent.recurrenceEnd
  //                     ? null
  //                     : formatDateToDatabase(
  //                       set(Date.now(), {
  //                         seconds: 0,
  //                         milliseconds: 0,
  //                       })
  //                     ),
  //                 })
  //               }
  //             />
  //           }
  //           label="Niemals"
  //         />

  //         <DatePicker
  //           sx={{ mt: 2, mb: 2, width: '100%' }}
  //           label="Start"
  //           disabled={editedEvent.recurrenceEnd === null}
  //           onChange={(val) => {
  //             if (!val) return;
  //             setEditedEvent({
  //               ...editedEvent,
  //               recurrenceEnd: formatDateToDatabase(
  //                 set(editedEvent.recurrenceEnd ? new Date(editedEvent.recurrenceEnd) : Date.now(), {
  //                   date: val.getDate(),
  //                   year: val.getFullYear(),
  //                   month: val.getMonth(),
  //                   hours: 0,
  //                   minutes: 0,
  //                   seconds: 0,
  //                   milliseconds: 0,
  //                 })
  //               ),
  //             });
  //           }}
  //           value={editedEvent.recurrenceEnd ? formatDateFromDatabase(editedEvent.recurrenceEnd) : null}
  //         />

  //         <Typography>Es werden Termine erstellt bis einschließlich diesem Tag. Alles danach entfällt</Typography>
  //       </DialogContent>
  //       <DialogActions>
  //         <Button onClick={() => setDialogOpen(null)}>Bestätigen</Button>
  //       </DialogActions>
  //     </Dialog>

  //     <SearchPlacesDialog
  //       open={dialogOpen === 'places'}
  //       handleClose={() => setDialogOpen(null)}
  //       placeSelected={(place) => {
  //         setEditedEvent({
  //           ...editedEvent,
  //           place: JSON.stringify({
  //             name: place.name,
  //             description: place.description,
  //             lat: place.lat,
  //             lon: place.lon,
  //           }),
  //         });
  //         setDialogOpen(null);
  //       }}
  //     />
  //   </Dialog>
  // );
};

const SelectRecurrenceDialog = ({ open, onClose }: DialogProps<undefined, EventRecurrence | null>) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent >
      <div className={"pt-8 flex flex-col gap-4"}>
        {Array.from<{ value: EventRecurrence; label: string }>([
          { value: 'None', label: 'Gar nicht' },
          { value: 'Weekly', label: 'Wöchentlich' },
          { value: 'Fortnightly', label: 'Alle 2 Wochen' },
          { value: 'Monthly', label: 'Monatlich' },
        ]).map((item) => (
          <Item key={item.value} variant={"outline"} onClick={() => onClose(item.value)}>
            <ItemContent>
              <ItemTitle>{item.label}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </div>
    </DialogContent>
  </Dialog>
)

const SelectRecurrenceEndDialog = ({ open, onClose, payload }: DialogProps<Date | null, Date | 'unset' | null>) => {

  const [date, setDate] = useState(payload);

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent>
      <div className={"pt-8 flex flex-col gap-4"}>
        <FieldSet>
          <FieldLegend>Wiederholungsende</FieldLegend>
          <FieldDescription>Bis wann soll die Wiederholung fortgesetzt werden?</FieldDescription>
          <FieldGroup className='flex-row'>
            <Field>
              <FieldLabel htmlFor="date">Datum</FieldLabel>
              <DatePicker
                id='date'
                placeholder='Datum'
                onValueChange={(val) => {
                  if (!val) return;
                  setDate(set(date ?? new Date(), {
                    date: val.getDate(),
                    year: val.getFullYear(),
                    month: val.getMonth(),
                    seconds: 0,
                    milliseconds: 0,
                  }))
                }}
                value={date ?? undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="time">Uhrzeit</FieldLabel>
              <TimePicker
                id="time"
                placeholder="12:30"
                value={date ?? undefined}
                onValueChange={(val) => {
                  if (!val) return;
                  setDate(set(date ?? new Date(), {
                    hours: val.getHours(),
                    minutes: val.getMinutes(),
                    seconds: 0,
                    milliseconds: 0,
                  }))
                }}
              />
            </Field>
          </FieldGroup>
        </FieldSet>

        <Button onClick={() => onClose(date)}>
          Speichern
        </Button>

        <Button disabled={!date} variant={"outline"} onClick={() => onClose('unset')}>
          <Trash2 />
          Wiederholungsende löschen
        </Button>
      </div>
    </DialogContent>
  </Dialog>
}

type BringItem = {
  created_at: string;
  created_by: string | null;
  event: string;
  id: string;
  name: string;
  notes: string | null;
  required_qty: number | null;
  sort_order: number;
  unit: string;
};

type Props = {
  bringItems: BringItem[]
  user: User
  eventId: string
}

export const PledgesDialog = ({ open, onClose, payload: { bringItems, user, eventId } }: DialogProps<Props, BringItem[]>) => {

  const [items, setItems] = useState(bringItems);

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(items)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4'>
        <DialogTitle>Gegenstände mitbringen</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2'>
          {
            items.map((item, index) => (
              <Item variant={"outline"} key={item.id}>
                <ItemContent className='flex flex-1 flex-row'>
                  <Input
                    className='flex-grow'
                    placeholder="Gegenstand"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].name = e.target.value;
                      setItems(newItems);
                    }} />
                  <Input
                    className='flex-none w-24'
                    type="number"
                    placeholder="Anzahl"
                    value={item.required_qty ?? 0}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value);
                      const newItems = [...items];
                      if (Number.isNaN(parsed)) {
                        newItems[index].required_qty = 0;
                      } else {
                        newItems[index].required_qty = parsed < 0 ? 0 : parsed;
                      }

                      setItems(newItems);
                    }} />
                  <Button
                    className='flex-shrink'
                    variant={"outline"} onClick={() => {
                      const newItems = [...items];
                      newItems.splice(index, 1);
                      setItems(newItems);
                    }}>
                    <Trash2 />
                  </Button>
                </ItemContent>
              </Item>
            ))
          }

        </div>
      </DialogBody>
      <DialogFooter variant={"fullscreen"}>
        <Button onClick={() => {
          setItems([
            ...items,
            {
              name: '',
              required_qty: 1,
              created_at: formatDateToDatabase(Date.now()),
              created_by: user.id,
              event: eventId,
              sort_order: 0,
              id: '',
              notes: '',
              unit: 'Stk.',
            },
          ]);
        }}>
          Hinzufügen
        </Button>
      </DialogFooter>
    </DialogContent>

  </Dialog>
}