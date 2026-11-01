import { useGrants } from '@/features/auth/GrantsContext';
import { useCreateSeriesMutation, useInsertEventMutation, useUpdateRecurrenceMutation, useUpdateSeriesMutation, useUpdateSingleMutation } from '@/tanstack/events';
import { formatDateFromDatabase, formatDateToDatabase, nameOfRecurrence } from '@/utils';
import { buildRRule, intervalSecondsLiteral, type EventRecurrence } from '@/utils/rrule';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { TimePicker } from '@/components/ui/time-picker';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { add, Duration, format, isAfter, set } from 'date-fns';
import { t } from 'i18next';
import { differenceWith, fromPairs, isEqual, toPairs } from 'lodash';
import { CalendarSync, CalendarX2, Map, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EventTable } from 'types/supabase';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { Json, Tables, TablesInsert, TablesUpdate } from '../../../types/supabase-generated.types';
import { CreateEventOption, PlaceType } from '../types';
const SearchPlacesDialog = React.lazy(() => import('./SearchPlacesDialog'));

const DEFAULT_DURATION: Duration = { hours: 2 };

const createEmptyEvent = () => ({
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
}) as EventTable;

const EVENT_DATE_FIELDS = ['startingDateTime', 'endDateTime', 'meetingDateTime', 'answerDeadline'] as const;

// Derive a recurring-series template from the edited event. Used both when creating a recurring
// event and when editing "this and all following" (which redefines the series going forward).
const buildSeriesFromEvent = (
  ev: TablesInsert<'events'>,
  bring_items: { name: string; required_qty: number | null }[]
): TablesInsert<'event_series'> => {
  const start = ev.startingDateTime;
  const rrule = buildRRule(ev.recurrence as EventRecurrence, new Date(start));
  if (!rrule) throw new Error('Keine Wiederholung ausgewählt.');
  const items = bring_items
    .filter((x) => x.name && (x.required_qty ?? 0) > 0)
    .map((x, i) => ({ name: x.name, unit: 'Stk.', required_qty: x.required_qty ?? 0, notes: null, sort_order: i }));
  return {
    group: ev.group,
    title: ev.title ?? '',
    description: ev.description ?? '',
    place: ev.place ?? null,
    timezone: 'Europe/Berlin',
    rrule,
    recurrence: ev.recurrence,
    until: ev.recurrenceEnd ?? null,
    dtstart: start,
    duration: intervalSecondsLiteral(start, ev.endDateTime),
    meeting_offset: ev.meetingDateTime ? intervalSecondsLiteral(start, ev.meetingDateTime) : null,
    answer_offset: ev.answerDeadline ? intervalSecondsLiteral(start, ev.answerDeadline) : null,
    max_attendees: ev.maxAttendees ?? null,
    max_trial_attendees: ev.max_trial_attendees ?? null,
    required_item: ev.required_item ?? null,
    items_enabled: items.length > 0,
    constellations_enabled: ev.constellations_enabled ?? false,
    reminder_before: ev.reminder_before ?? null,
    items_template: items as unknown as Json,
  };
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error.');

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
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [editedEvent, setEditedEvent] = useState<EventTable>(() => event ?? createEmptyEvent());
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(eventGroup ?? null);
  const [bringItems, setBringItems] = useState(items);
  const ref = useRef<HTMLFormElement>(null);

  const place = useMemo(() => (editedEvent.place ? (JSON.parse(editedEvent.place) as PlaceType) : null), [editedEvent]);

  const insertEvent = useInsertEventMutation();
  const updateSingleEvent = useUpdateSingleMutation();
  const updateRecurrenceEvents = useUpdateRecurrenceMutation();
  const createSeries = useCreateSeriesMutation();
  const updateSeries = useUpdateSeriesMutation();
  const isSaving =
    insertEvent.isPending ||
    updateSingleEvent.isPending ||
    updateRecurrenceEvents.isPending ||
    createSeries.isPending ||
    updateSeries.isPending;

  // Events are only visible (RLS) to members of their group, so warn before the event "disappears".
  const isMemberOfSelectedGroup = useMemo(() => {
    if (!editedEvent.group) return true;
    return (user.groups as GroupWithUserRole[]).some(
      (g) => g.id === editedEvent.group && (g.user_role === 'user' || g.user_role === 'admin')
    );
  }, [editedEvent.group, user.groups]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      const bring_items = bringItems.filter((x) => x.name && x.required_qty && x.required_qty > 0);

      // Build the final event synchronously; state updates would only be visible on the next render.
      const finalEvent = {
        ...editedEvent,
        ...(option === 'InsertEvent' && !editedEvent.meetingDateTime && { meetingDateTime: editedEvent.startingDateTime }),
        items_enabled: bring_items.length > 0,
      } as TablesInsert<'events'>;

      const changes = differenceWith(toPairs(finalEvent), event ? toPairs(event) : [], isEqual);
      const eventChanges = fromPairs(changes) as TablesUpdate<'events'>;

      if (!finalEvent.startingDateTime) throw new Error(t('events.creation.startDateCannotBeNull'));

      if (!finalEvent.group) throw new Error(t('events.creation.noGroupSelected'));

      if (finalEvent.answerDeadline && isAfter(finalEvent.answerDeadline, finalEvent.startingDateTime))
        throw new Error(t('events.creation.answerDeadlineAfterStart'));

      if (!finalEvent.title || finalEvent.title.length < 6) throw new Error(t('events.creation.titleTooShort'));

      if (!finalEvent.description || finalEvent.description.length < 1)
        throw new Error(t('events.creation.descriptionEmpty'));

      if (finalEvent.meetingDateTime)
        if (isAfter(finalEvent.meetingDateTime, finalEvent.startingDateTime))
          throw new Error(t('events.creation.meetingTimeBeforeStartTime'));

      if (option === 'InsertEvent') {
        const isRecurring = !!finalEvent.recurrence && finalEvent.recurrence !== 'None';
        try {
          if (isRecurring) {
            // Recurring events are a series template; occurrences are materialized by the expander.
            await createSeries.mutateAsync({
              ...buildSeriesFromEvent(finalEvent, bring_items),
              created_by: user.id,
            });
          } else {
            await insertEvent.mutateAsync({
              event: eventChanges as Tables<'events'>,
              currentUser: user,
              items: bring_items.map((x) => ({
                name: x.name,
                required_qty: x.required_qty ?? 0,
                unit: 'Stk.',
                sort_order: 0,
                notes: null,
              })),
            });
          }
        } catch (error) {
          toast.error('Event konnte nicht erstellt werden: ' + errorMessage(error));
          return;
        }
        toast.success(isRecurring ? 'Serie wurde erstellt' : 'Event wurde erstellt');
        onClose();
      } else if (option === 'UpdateSingle') {
        try {
          await updateSingleEvent.mutateAsync({
            // Detach this occurrence so later series edits / regeneration leave it alone.
            eventChanges: { ...eventChanges, detached: true },
            id: finalEvent.id ?? '',
            currentUser: user,
            items: bring_items,
          });
        } catch (error) {
          toast.error('Event konnte nicht aktualisiert werden: ' + errorMessage(error));
          return;
        }
        toast.success('Event wurde gespeichert');
        onClose();
      } else if (option === 'UpdateRecurrence') {
        if (!event) throw new Error('Event not found.');
        const isRecurring = !!finalEvent.recurrence && finalEvent.recurrence !== 'None';

        try {
          if (isRecurring) {
            // "This and all following events" redefines the series template; the expander then
            // updates future occurrences in place (preserving attendance) and prunes removed ones.
            await updateSeries.mutateAsync({ key: event.key, patch: buildSeriesFromEvent(finalEvent, bring_items) });
          } else {
            // Recurrence removed: fall back to shifting the remaining occurrence rows directly.
            const dateFieldChanged = EVENT_DATE_FIELDS.some((field) => field in eventChanges);
            const recurrenceChanges: TablesUpdate<'events'> = dateFieldChanged
              ? {
                ...eventChanges,
                ...Object.fromEntries(
                  EVENT_DATE_FIELDS.filter((field) => finalEvent[field]).map((field) => [field, finalEvent[field]])
                ),
              }
              : eventChanges;
            await updateRecurrenceEvents.mutateAsync({
              eventChanges: recurrenceChanges,
              key: event.key,
              originalStartingDateTime: event.startingDateTime,
              currentUser: user,
              items: bring_items,
            });
          }
        } catch (error) {
          toast.error('Events konnten nicht aktualisiert werden: ' + errorMessage(error));
          return;
        }
        toast.success('Events wurden gespeichert');
        onClose();
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  }

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogHeader variant={"appbar"}>
        <DialogTitle className={"flex-1"}>{`Event ${event ? 'bearbeiten' : 'erstellen'}`}</DialogTitle>
        <DialogClose />
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

            {!isMemberOfSelectedGroup && (
              <Alert variant={"warning"}>
                <TriangleAlert />
                <AlertTitle>{t('events.creation.notMemberOfGroupTitle')}</AlertTitle>
                <AlertDescription>{t('events.creation.notMemberOfGroup')}</AlertDescription>
              </Alert>
            )}
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
            <FieldLabel>
              <Field>
                <FieldLabel htmlFor="event-maxattendees">Anmeldedeadline</FieldLabel>
                <FieldGroup className='flex-row gap-2'>
                  <Field className='w-full'>
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
                      answerDeadline: null,
                      reminder_before: null,
                    })
                  }}>
                    <Trash2 />
                  </Button>

                </FieldGroup>

                {editedEvent.answerDeadline && (
                  <FieldGroup className='flex flex-row items-center gap-3 justify-between'>
                    <FieldLabel className='shrink-0 w-32 text-sm'>{t('events.creation.reminderBefore')}</FieldLabel>
                    <Select
                      value={editedEvent.reminder_before ?? ''}
                      onValueChange={(v) =>
                        setEditedEvent((prev) => ({ ...prev, reminder_before: v || null }))
                      }
                    >
                      <SelectTrigger className='flex-1 max-w-72' disabled={!editedEvent.answerDeadline}>
                        <SelectValue placeholder={t('events.creation.reminderNone')}>
                          {
                            !editedEvent.reminder_before || editedEvent.reminder_before === "" ? t('events.creation.reminderNone') : t(`events.creation.reminder${editedEvent.reminder_before}`)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('events.creation.reminderNone')}</SelectItem>
                        <SelectItem value="PT30M">{t('events.creation.reminderPT30M')}</SelectItem>
                        <SelectItem value="PT1H">{t('events.creation.reminderPT1H')}</SelectItem>
                        <SelectItem value="PT6H">{t('events.creation.reminderPT6H')}</SelectItem>
                        <SelectItem value="PT12H">{t('events.creation.reminderPT12H')}</SelectItem>
                        <SelectItem value="PT24H">{t('events.creation.reminderPT24H')}</SelectItem>
                        <SelectItem value="P2D">{t('events.creation.reminderP2D')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                )}
              </Field>
            </FieldLabel>



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
          disabled={isSaving}
          onClick={() => {
            if (ref.current) ref.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }}
        >
          {isSaving && <Spinner />}
          Speichern
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog >
}

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