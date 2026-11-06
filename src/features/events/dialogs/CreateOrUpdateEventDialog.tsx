import { useGrants } from '@/features/auth/GrantsContext';
import { useCreateSeriesMutation, useInsertEventMutation, useUpdateRecurrenceMutation, useUpdateSeriesMutation, useUpdateSingleMutation } from '@/tanstack/events';
import { formatDateFromDatabase, formatDateToDatabase } from '@/utils';
import { buildRRule, intervalSecondsLiteral, type EventRecurrence } from '@/utils/rrule';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemContent } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { TimePicker } from '@/components/ui/time-picker';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { add, addDays, addMilliseconds, differenceInCalendarDays, differenceInMinutes, Duration, format, isAfter, isSameDay, set } from 'date-fns';
import { t } from 'i18next';
import { differenceWith, fromPairs, isEqual, toPairs } from 'lodash';
import { CalendarClock, CalendarX2, ChevronRight, Info, Map, MapPin, Package, Pencil, Repeat, ShoppingBag, Trash2, TriangleAlert, Type, UserCheck, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EventTable } from 'types/supabase';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { Json, Tables, TablesInsert, TablesUpdate } from '../../../types/supabase-generated.types';
import { CreateEventOption, PlaceType } from '../types';
import { FieldHint, FormSection, Stepper, ToggleRow } from './EventFormParts';
const SearchPlacesDialog = React.lazy(() => import('./SearchPlacesDialog'));

const DEFAULT_DURATION: Duration = { hours: 2 };
const FORM_ID = 'create-or-update-event-form';

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
  if (!rrule) throw new Error(t('events.creation.noRecurrenceSelected'));
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

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : t('events.creation.unknownError'));

type CreateEventProps = {
  event?: EventTable | null;
  eventGroup?: Group | null;
  option: CreateEventOption;
  items?: BringItems[];
};

const getItems = (): {
  value: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe" | null
  label: string
}[] => [
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
      label: t('events.creation.itemMtvGymPalazzo')
    },
    {
      value: "goethe",
      label: "Goethe Gymnasium"
    },
    {
      value: null,
      label: t('events.creation.itemNone')
    }
  ]

export const CreateOrUpdateEventDialog = ({
  payload: { event, eventGroup, option, items = [] },
  open,
  onClose,
}: DialogProps<CreateEventProps>) => {
  const { t } = useTranslation();
  const ITEMS = getItems();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [editedEvent, setEditedEvent] = useState<EventTable>(() => event ?? createEmptyEvent());
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(eventGroup ?? null);
  const [bringItems, setBringItems] = useState(items);
  const [submitted, setSubmitted] = useState(false);
  const [showEndDate, setShowEndDate] = useState(
    () => !!event && !isSameDay(new Date(event.startingDateTime), new Date(event.endDateTime))
  );

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
    setSubmitted(true);

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

      if (!isAfter(finalEvent.endDateTime, finalEvent.startingDateTime))
        throw new Error(t('events.creation.endBeforeStart'));

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
          toast.error(t('events.creation.createFailed', { message: errorMessage(error) }));
          return;
        }
        toast.success(isRecurring ? t('events.creation.seriesCreated') : t('events.creation.eventCreated'));
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
          toast.error(t('events.creation.updateFailed', { message: errorMessage(error) }));
          return;
        }
        toast.success(t('events.creation.eventSaved'));
        onClose();
      } else if (option === 'UpdateRecurrence') {
        if (!event) throw new Error(t('events.creation.eventNotFound'));
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
          toast.error(t('events.creation.updateRecurrenceFailed', { message: errorMessage(error) }));
          return;
        }
        toast.success(t('events.creation.eventsSaved'));
        onClose();
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  }

  const patch = (changes: Partial<EventTable>) => setEditedEvent((prev) => ({ ...prev, ...changes }));

  // Moving the start carries the end and the meet-up time along, so the event keeps its length.
  const moveStart = (next: Date, shift: (d: Date) => Date) =>
    setEditedEvent((prev) => {
      const moved = (v: string | null) => (v ? formatDateToDatabase(shift(new Date(v))) : v);
      return {
        ...prev,
        startingDateTime: formatDateToDatabase(next),
        endDateTime: moved(prev.endDateTime) as string,
        meetingDateTime: moved(prev.meetingDateTime),
      };
    });

  const start = new Date(editedEvent.startingDateTime);
  const end = new Date(editedEvent.endDateTime);
  const endBeforeStart = !isAfter(end, start);
  const minutes = differenceInMinutes(end, start);
  const durationLabel = `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  const deadline = editedEvent.answerDeadline ? new Date(editedEvent.answerDeadline) : null;
  const deadlineAfterStart = !!deadline && isAfter(deadline, start);
  const isRecurring = !!editedEvent.recurrence && editedEvent.recurrence !== 'None';
  const titleError = submitted && (editedEvent.title ?? '').length < 6;
  const descriptionError = submitted && !editedEvent.description;
  const groupError = submitted && !editedEvent.group;
  const itemOptions = ITEMS.filter((x) => x.value !== null);

  const pickPlace = async () => {
    const result = await dialogs.open(SearchPlacesDialog);
    if (result) {
      patch({
        place: JSON.stringify({
          name: result.name,
          description: result.description,
          lat: result.lat,
          lon: result.lon,
        }),
      });
    }
  };

  const defaultDeadline = () => {
    const dayBefore = add(start, { days: -1 });
    return formatDateToDatabase(isAfter(dayBefore, new Date()) ? dayBefore : add(start, { hours: -1 }));
  };

  const RECURRENCES: EventRecurrence[] = ['None', 'Weekly', 'Fortnightly', 'Monthly'];

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogHeader variant={"appbar"}>
        <DialogTitle className={"flex-1"}>{event ? t('events.editEvent') : t('events.creation.titleCreate')}</DialogTitle>
        <DialogClose />
      </DialogHeader>
      <DialogBody className='bg-muted/30 p-0'>
        <form id={FORM_ID} onSubmit={handleSubmit} noValidate className='flex flex-col gap-3 p-3 pb-6'>
          {option === 'UpdateSingle' && (
            <Alert variant="info">
              <Info />
              <AlertDescription>{t('events.creation.editingSingle')}</AlertDescription>
            </Alert>
          )}
          {option === 'UpdateRecurrence' && (
            <Alert variant="info">
              <Info />
              <AlertDescription>{t('events.creation.editingFollowing')}</AlertDescription>
            </Alert>
          )}

          <FormSection icon={Type} title={t('events.creation.sectionBasics')}>
            <Field className='gap-1.5' data-invalid={titleError}>
              <FieldLabel htmlFor='event-title'>{t('events.creation.titleLabel')}</FieldLabel>
              <Input
                id="event-title"
                name="event-title"
                placeholder={t('events.creation.titlePlaceholder')}
                className='w-full'
                aria-invalid={titleError}
                value={editedEvent.title}
                onChange={(e) => patch({ title: e.target.value })}
                required
              />
              <FieldHint error={titleError}>{t('events.creation.titleHint')}</FieldHint>
            </Field>

            <Field className='gap-1.5' data-invalid={descriptionError}>
              <FieldLabel htmlFor='event-description'>{t('events.creation.descriptionLabel')}</FieldLabel>
              <Textarea
                id="event-description"
                name="event-description"
                placeholder={t('events.creation.descriptionPlaceholder')}
                className='min-h-24 w-full'
                aria-invalid={descriptionError}
                value={editedEvent.description}
                onChange={(e) => patch({ description: e.target.value })}
                required
              />
            </Field>

            <Field className='gap-1.5'>
              <FieldLabel>{t('events.creation.groupLabel')}</FieldLabel>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left',
                  groupError && 'border-destructive'
                )}
                onClick={async () => {
                  const result = await dialogs.selectGroup([], selectedGroup?.id);
                  if (result) {
                    setSelectedGroup(result);
                    patch({ group: result.id });
                  }
                }}
              >
                <Users className='size-4 text-muted-foreground' />
                <span className={cn('flex-1 truncate text-sm', !selectedGroup && 'text-muted-foreground')}>
                  {selectedGroup?.name ?? t('events.creation.noGroupChosen')}
                </span>
                <ChevronRight className='size-4 text-muted-foreground' />
              </button>
              {groupError && <FieldHint error>{t('events.creation.noGroupSelected')}</FieldHint>}
            </Field>

            {!isMemberOfSelectedGroup && (
              <Alert variant={"warning"}>
                <TriangleAlert />
                <AlertTitle>{t('events.creation.notMemberOfGroupTitle')}</AlertTitle>
                <AlertDescription>{t('events.creation.notMemberOfGroup')}</AlertDescription>
              </Alert>
            )}
          </FormSection>

          <FormSection icon={CalendarClock} title={t('events.creation.dateTimes')}>
            <Field className='gap-1.5'>
              <FieldLabel htmlFor="event-startdate">{t('events.creation.date')}</FieldLabel>
              <DatePicker
                id='event-startdate'
                placeholder={t('costs.date')}
                className='w-full'
                value={start}
                onValueChange={(val) => {
                  if (!val) return;
                  const next = set(start, { date: val.getDate(), month: val.getMonth(), year: val.getFullYear() });
                  const days = differenceInCalendarDays(next, start);
                  moveStart(next, (d) => addDays(d, days));
                }} />
            </Field>

            <div className='grid grid-cols-2 gap-3'>
              <Field className='gap-1.5'>
                <FieldLabel htmlFor="event-starttime">{t('events.creation.from')}</FieldLabel>
                <TimePicker
                  id="event-starttime"
                  className='!w-full'
                  value={start}
                  onValueChange={(newDate) => {
                    if (!newDate) return;
                    const delta = newDate.getTime() - start.getTime();
                    moveStart(newDate, (d) => addMilliseconds(d, delta));
                  }}
                />
              </Field>
              <Field className='gap-1.5' data-invalid={endBeforeStart}>
                <FieldLabel htmlFor="event-endtime">{t('events.creation.until')}</FieldLabel>
                <TimePicker
                  id="event-endtime"
                  className='!w-full'
                  value={end}
                  onValueChange={(newDate) => {
                    if (newDate) patch({ endDateTime: formatDateToDatabase(newDate) });
                  }}
                />
              </Field>
            </div>
            {endBeforeStart
              ? <FieldHint error>{t('events.creation.endBeforeStart')}</FieldHint>
              : <FieldHint>{t('events.creation.duration', { value: durationLabel })}</FieldHint>}

            <ToggleRow
              id="event-multiday"
              title={t('events.creation.endsOnOtherDay')}
              checked={showEndDate}
              onCheckedChange={(checked) => {
                setShowEndDate(checked);
                patch({
                  endDateTime: formatDateToDatabase(
                    checked
                      ? addDays(end, 1)
                      : set(end, { date: start.getDate(), month: start.getMonth(), year: start.getFullYear() })
                  ),
                });
              }}
            >
              <DatePicker
                id='event-enddate'
                placeholder={t('costs.date')}
                className='w-full'
                value={end}
                onValueChange={(val) => {
                  if (!val) return;
                  patch({
                    endDateTime: formatDateToDatabase(
                      set(end, { date: val.getDate(), month: val.getMonth(), year: val.getFullYear() })
                    ),
                  });
                }} />
            </ToggleRow>

            <ToggleRow
              id="event-meetingdatetime-enabled"
              title={t('events.creation.meetingBeforeTraining')}
              description={t('events.creation.meetingHint')}
              checked={editedEvent.meetingDateTime !== null}
              onCheckedChange={(checked) =>
                patch({ meetingDateTime: checked ? formatDateToDatabase(add(start, { minutes: -15 })) : null })
              }
            >
              <TimePicker
                id="event-meetingdatetime"
                className='!w-full'
                value={editedEvent.meetingDateTime ? new Date(editedEvent.meetingDateTime) : undefined}
                onValueChange={(newDate) => {
                  if (!newDate) return;
                  patch({
                    meetingDateTime: formatDateToDatabase(
                      set(start, { hours: newDate.getHours(), minutes: newDate.getMinutes() })
                    ),
                  });
                }}
              />
            </ToggleRow>
          </FormSection>

          <FormSection icon={MapPin} title={t('events.creation.location')}>
            {place ? (
              <div className='flex items-center gap-3 rounded-lg border bg-background p-3'>
                <MapPin className='size-4 shrink-0 text-primary' />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-medium'>{place.name}</div>
                  {place.description && <div className='truncate text-xs text-muted-foreground'>{place.description}</div>}
                </div>
                <Button type="button" variant="outline" size="icon-lg" aria-label={t('events.creation.changeLocation')} onClick={pickPlace}>
                  <Pencil />
                </Button>
                <Button type="button" variant="outline" size="icon-lg" aria-label={t('events.creation.removeLocation')} onClick={() => patch({ place: null })}>
                  <Trash2 />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className='h-14 w-full border-dashed' onClick={pickPlace}>
                <Map />
                {t('events.creation.chooseLocation')}
              </Button>
            )}
          </FormSection>

          {option !== 'UpdateSingle' && (
            <FormSection icon={Repeat} title={t('events.creation.recurrence')}>
              <div role="radiogroup" aria-label={t('events.creation.recurrence')} className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {RECURRENCES.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={editedEvent.recurrence === r}
                    variant={editedEvent.recurrence === r ? 'default' : 'outline'}
                    onClick={() => patch({ recurrence: r, ...(r === 'None' && { recurrenceEnd: null }) })}
                  >
                    {t(`events.creation.recurrenceShort.${r}`)}
                  </Button>
                ))}
              </div>
              {isRecurring && (
                <div className='flex items-center gap-3 rounded-lg border bg-background p-3'>
                  <CalendarX2 className='size-4 shrink-0 text-muted-foreground' />
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium'>{t('events.creation.recurrenceEnd')}</div>
                    <div className='text-xs text-muted-foreground'>
                      {editedEvent.recurrenceEnd
                        ? t('events.creation.endsAt', { date: format(editedEvent.recurrenceEnd, "dd.MM.yyyy") })
                        : t('events.creation.recurrenceNever')}
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={async () => {
                    const result = await dialogs.open(SelectRecurrenceEndDialog, formatDateFromDatabase(editedEvent.recurrenceEnd));
                    if (result && result !== 'unset') patch({ recurrenceEnd: formatDateToDatabase(result) });
                    else if (result === 'unset') patch({ recurrenceEnd: null });
                  }}>
                    {t('events.creation.change')}
                  </Button>
                </div>
              )}
            </FormSection>
          )}

          <FormSection icon={UserCheck} title={t('events.creation.sectionRegistration')}>
            <ToggleRow
              id="event-deadline-enabled"
              title={t('events.creation.signupDeadline')}
              description={t('events.creation.signupDeadlineHint')}
              checked={!!editedEvent.answerDeadline}
              onCheckedChange={(checked) =>
                patch(checked ? { answerDeadline: defaultDeadline() } : { answerDeadline: null, reminder_before: null })
              }
            >
              <div className='grid grid-cols-[1fr_7rem] gap-3'>
                <DatePicker
                  id='event-signupstartdate'
                  placeholder={t('costs.date')}
                  className='w-full'
                  value={deadline ?? undefined}
                  onValueChange={(val) => {
                    if (!val || !deadline) return;
                    patch({
                      answerDeadline: formatDateToDatabase(
                        set(deadline, { date: val.getDate(), month: val.getMonth(), year: val.getFullYear() })
                      ),
                    });
                  }} />
                <TimePicker
                  id="event-signupstarttime"
                  className='!w-full'
                  value={deadline ?? undefined}
                  onValueChange={(newDate) => newDate && patch({ answerDeadline: formatDateToDatabase(newDate) })}
                />
              </div>
              {deadlineAfterStart && <FieldHint error>{t('events.creation.answerDeadlineAfterStart')}</FieldHint>}
              <Field className='gap-1.5'>
                <FieldLabel>{t('events.creation.reminderBefore')}</FieldLabel>
                <Select
                  value={editedEvent.reminder_before ?? ''}
                  onValueChange={(v) => patch({ reminder_before: v || null })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('events.creation.reminderNone')}>
                      {!editedEvent.reminder_before ? t('events.creation.reminderNone') : t(`events.creation.reminder${editedEvent.reminder_before}`)}
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
              </Field>
            </ToggleRow>

            <ToggleRow
              id="event-maxattendees-enabled"
              title={t('events.creation.maxAttendees')}
              description={t('events.creation.maxAttendeesHint')}
              checked={typeof editedEvent.maxAttendees === 'number'}
              onCheckedChange={(checked) => patch({ maxAttendees: checked ? 12 : null })}
            >
              <Stepper label={t('events.creation.maxAttendees')} value={editedEvent.maxAttendees ?? 0} onChange={(v) => patch({ maxAttendees: v })} />
            </ToggleRow>

            <Has feat={"events.trials"}>
              <ToggleRow
                id="event-maxtrial-enabled"
                title={t('events.creation.maxTrialAttendees')}
                checked={typeof editedEvent.max_trial_attendees === 'number'}
                onCheckedChange={(checked) => patch({ max_trial_attendees: checked ? 2 : null })}
              >
                <Stepper label={t('events.creation.maxTrialAttendees')} value={editedEvent.max_trial_attendees ?? 0} onChange={(v) => patch({ max_trial_attendees: v })} />
              </ToggleRow>
            </Has>
          </FormSection>

          <Has feat={["items", "games"]} any>
            <FormSection icon={Package} title={t('events.creation.sectionExtras')}>
              <Has feat={"items"}>
                <ToggleRow
                  id="event-required-item-enabled"
                  title={t('events.creation.requiredItem')}
                  checked={typeof editedEvent.required_item === "string"}
                  onCheckedChange={(checked) => patch({ required_item: checked ? 'mtvGym' : null })}
                >
                  <Select items={itemOptions} value={editedEvent.required_item} onValueChange={(val) => patch({ required_item: val })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('events.creation.selectItem')} />
                    </SelectTrigger>
                    <SelectContent>
                      {itemOptions.map((x) => (
                        <SelectItem key={x.value} value={x.value} >{x.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ToggleRow>
              </Has>

              <Has feat={"games"}>
                <ToggleRow
                  id="event-constellations_enabled"
                  title={t('events.creation.constellationsEnabled')}
                  description={t('events.creation.constellationsEnabledHint')}
                  checked={!!editedEvent.constellations_enabled}
                  onCheckedChange={(val) => patch({ constellations_enabled: val })}
                />
              </Has>
            </FormSection>
          </Has>

          <FormSection icon={ShoppingBag} title={t('events.creation.bringItems')}>
            <div className='flex items-center gap-3'>
              <div className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
                {bringItems.length
                  ? bringItems.map((x, i) => <Badge key={x.id || i}>{`${x.required_qty}x ${x.name}`}</Badge>)
                  : <span className='text-sm text-muted-foreground'>{t('events.creation.noBringItems')}</span>}
              </div>
              <Button type="button" variant="outline" onClick={async () => {
                const result = await dialogs.open(PledgesDialog, {
                  bringItems: bringItems,
                  eventId: editedEvent.id,
                  user: user
                });
                setBringItems(result ?? [])
              }}>
                <Pencil />
                {t('events.creation.change')}
              </Button>
            </div>
          </FormSection>
        </form>
      </DialogBody>
      <DialogFooter variant={"fullscreen"}>
        <Button type="submit" form={FORM_ID} className='w-full' disabled={isSaving}>
          {isSaving && <Spinner />}
          {event ? t('common.save') : t('events.creation.createEvent')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog >
}

const SelectRecurrenceEndDialog = ({ open, onClose, payload }: DialogProps<Date | null, Date | 'unset' | null>) => {
  const { t } = useTranslation();

  const [date, setDate] = useState(payload);

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent>
      <div className={"pt-8 flex flex-col gap-4"}>
        <FieldSet>
          <FieldLegend>{t('events.creation.recurrenceEnd')}</FieldLegend>
          <FieldDescription>{t('events.creation.recurrenceEndQuestion')}</FieldDescription>
          <FieldGroup className='flex-row'>
            <Field>
              <FieldLabel htmlFor="date">{t('costs.date')}</FieldLabel>
              <DatePicker
                id='date'
                placeholder={t('costs.date')}
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
              <FieldLabel htmlFor="time">{t('events.creation.time')}</FieldLabel>
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
          {t('common.save')}
        </Button>

        <Button disabled={!date} variant={"outline"} onClick={() => onClose('unset')}>
          <Trash2 />
          {t('events.creation.deleteRecurrenceEnd')}
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
  const { t } = useTranslation();

  const [items, setItems] = useState(bringItems);

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(items)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4'>
        <DialogTitle>{t('events.creation.bringItems')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2'>
          {
            items.map((item, index) => (
              <Item variant={"outline"} key={item.id}>
                <ItemContent className='flex flex-1 flex-row'>
                  <Input
                    className='flex-grow'
                    placeholder={t('events.creation.item')}
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].name = e.target.value;
                      setItems(newItems);
                    }} />
                  <Input
                    className='flex-none w-24'
                    type="number"
                    placeholder={t('events.creation.quantity')}
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
          {t('events.creation.add')}
        </Button>
      </DialogFooter>
    </DialogContent>

  </Dialog>
}
