import { TransformationTrigger } from '@/features/events/dialogs/TransformEventDialog';
import { DeleteEventType } from '@/features/events/types';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { EventRepository } from '@/repository/EventRepository';
import { GamesRepository } from '@/repository/GamesRepository';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { EventsUserView, FullAttendance, FullComment } from '@/types/supabaseTypes';
import { durationToPostgresInterval, formatDateFromDatabaseNotNull, formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Duration, format, isBefore } from 'date-fns';

export const eventKeys = {
  all: ['events'] as const,
  list: (fetchMode: 'past' | 'upcoming') => [...eventKeys.all, fetchMode] as const,
  event: (id?: string) => [...eventKeys.all, id] as const,
  eventComments: (id?: string) => [...eventKeys.event(id), 'comments'] as const,
  eventBringOverview: (id?: string) => [...eventKeys.event(id), 'bringOverview'] as const,
  eventBringPledges: (id?: string) => [...eventKeys.event(id), 'bringPledges'] as const,
  eventAttendance: (id?: string) => [...eventKeys.event(id), 'attendance'] as const,
  eventUserAttendanceInMonth: (userId: string, month: number) => [...eventKeys.all, 'userAttendance', userId, "month", month] as const,
  eventMatches: (id?: string) => [...eventKeys.event(id), 'matches'] as const,
  recurring: () => [...eventKeys.all, 'recurring'] as const,
  eventTranformation: (eventKey: string) => [...eventKeys.all, 'transformation', eventKey] as const,
  eventTranformationApplication: (event: string) => [...eventKeys.all, 'transformation-application', event] as const,
};

const EVENT_LIST_MODES = ['past', 'upcoming'] as const;

type EventListSnapshot = Array<[ReturnType<typeof eventKeys.list>, EventsUserView[] | undefined]>;

/**
 * Invalidates every events query (both lists, details, recurring series, ...). Mutations return this
 * promise from onSuccess/onSettled so `mutateAsync` only resolves once fresh server data is loaded.
 */
export const invalidateEvents = (excludeEventId?: string) =>
  queryClient.invalidateQueries({
    queryKey: eventKeys.all,
    predicate: excludeEventId ? (query) => query.queryKey[1] !== excludeEventId : undefined,
  });

const invalidateEventLists = () =>
  Promise.all(EVENT_LIST_MODES.map((mode) => queryClient.invalidateQueries({ queryKey: eventKeys.list(mode), exact: true })));

const cancelEventLists = () =>
  Promise.all(EVENT_LIST_MODES.map((mode) => queryClient.cancelQueries({ queryKey: eventKeys.list(mode), exact: true })));

const snapshotEventLists = (): EventListSnapshot =>
  EVENT_LIST_MODES.map((mode) => [eventKeys.list(mode), queryClient.getQueryData<EventsUserView[]>(eventKeys.list(mode))]);

const restoreEventLists = (snapshot: EventListSnapshot) =>
  snapshot.forEach(([key, data]) => {
    if (data !== undefined) queryClient.setQueryData(key, data);
  });

const updateEventLists = (updater: (events: EventsUserView[]) => EventsUserView[]) =>
  EVENT_LIST_MODES.forEach((mode) =>
    queryClient.setQueryData<EventsUserView[]>(eventKeys.list(mode), (old) => (old ? updater(old) : old))
  );

/** Applies an optimistic change to an event in both lists and in its detail cache. */
const updateEventEverywhere = (eventId: string, updater: (event: EventsUserView) => EventsUserView) => {
  updateEventLists((events) => events.map((ev) => (ev.id === eventId ? updater(ev) : ev)));
  queryClient.setQueryData<EventsUserView | null>(eventKeys.event(eventId), (old) => (old ? updater(old) : old));
};

const EVENT_DATE_FIELDS = ['startingDateTime', 'endDateTime', 'meetingDateTime', 'answerDeadline'] as const;

/**
 * Converts a table update into a shape that is safe to merge into `EventsUserView` cache entries:
 * `group` is a uuid in the table but a joined object in the view, so it is left to the refetch.
 */
const toOptimisticChanges = (
  changes: TablesUpdate<'events'>,
  { includeDates = true }: { includeDates?: boolean } = {}
): Partial<EventsUserView> => {
  const rest = { ...changes };
  delete rest.group;
  if (!includeDates) EVENT_DATE_FIELDS.forEach((field) => delete rest[field]);
  return rest as Partial<EventsUserView>;
};

export const useEvents = (filter: 'past' | 'upcoming', limit?: number) => {
  return useQuery<EventsUserView[]>({
    queryKey: eventKeys.list(filter),
    queryFn: () => EventRepository.fetchUserEvents(filter),
  });
};

export const useEvent = (eventId?: string) =>
  useQuery<EventsUserView | null>({
    queryKey: eventKeys.event(eventId),
    enabled: !!eventId,
    queryFn: () => EventRepository.fetchUserEvent(eventId!),
  });

export const useRecurringEvents = () =>
  useQuery({
    queryKey: eventKeys.recurring(),
    queryFn: () => EventRepository.fetchRecurringEvents(),
  });

export const useCreateNextOccurences = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: () => EventRepository.createNextOccurrences(),
  onSuccess: () => invalidateEvents(),
});

// Recurring Events v2 — series templates. Occurrences are expanded in the browser
// (src/lib/recurrence-expander) and applied via the expand_series RPC; create/edit of a
// recurring event writes the series template and re-expands.
export const useExpandRecurrences = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: () => EventRepository.expandRecurrences(),
  onSuccess: () => invalidateEvents(),
});

export const useCreateSeriesMutation = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: (series: TablesInsert<'event_series'>) => EventRepository.createSeries(series),
  onSettled: () => invalidateEvents(),
});

export const useUpdateSeriesMutation = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: ({ key, patch }: { key: string; patch: TablesUpdate<'event_series'> }) =>
    EventRepository.updateSeriesByKey(key, patch),
  onSettled: () => invalidateEvents(),
});

export const useEventMatches = (eventId: string) =>
  useQuery<FullMatch[]>({
    queryKey: eventKeys.eventMatches(eventId),
    queryFn: () => GamesRepository.fetchGamesForEvent(eventId),
  });

export function useComments(eventId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`comments-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_comments', filter: `event=eq.${eventId}` },
        () => qc.invalidateQueries({ queryKey: eventKeys.eventComments(eventId) })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, qc]);

  return useQuery({
    queryKey: eventKeys.eventComments(eventId),
    queryFn: async () => {
      const comments = await EventRepository.fetchComments(eventId);

      const mainComments = comments
        .filter((x) => !x.reply_to)
        .map((x) => ({
          ...x,
          replies: comments.filter((y) => y.reply_to === x.id),
        }));

      return mainComments;
    },
  });
}

export const useBringOverview = (eventId: string) =>
  useQuery<Tables<'event_bring_overview'>[]>({
    queryKey: eventKeys.eventBringOverview(eventId),
    queryFn: () => EventRepository.fetchBringOverview(eventId),
  });

export const useBringItems = (eventId?: string) =>
  useQuery<BringItems[]>({
    queryKey: eventKeys.eventBringPledges(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!eventId) return [];
      return EventRepository.fetchBringItems(eventId);
    },
  });

export const useBringPledges = (eventId: string) =>
  useQuery<FullEventPledges[]>({
    queryKey: eventKeys.eventBringPledges(eventId),
    queryFn: () => EventRepository.fetchBringPledges(eventId),
  });

export const useUserAttendanceInMonth = (userId: string, month: number) =>
  useQuery({
    queryKey: eventKeys.eventUserAttendanceInMonth(userId, month),
    queryFn: async () => {
      const result = await EventRepository.fetchUserAttendanceInMonth(userId, month);
      return (result ?? []).map(x => formatDateFromDatabaseNotNull(x.eventTime.startingDateTime));
    },
  });

export const useAttendance = (eventId: string) =>
  useQuery({
    queryKey: eventKeys.eventAttendance(eventId),
    queryFn: () => EventRepository.fetchAttendance(eventId),
  });

export const useEventTransformation = (eventKey: string, open: boolean) =>
  useQuery<EventTransformation | null>({
    queryKey: eventKeys.eventTranformation(eventKey),
    enabled: open,
    queryFn: () => EventRepository.fetchEventTransformation(eventKey),
  });

export const useEventTransformationApplication = (event: string) =>
  useQuery({
    queryKey: eventKeys.eventTranformationApplication(event),
    queryFn: () => EventRepository.fetchEventTransformationApplication(event),
  });

export const useDeleteEventTransformation = () =>
  useMutation({
    mutationFn: async (payload: { eventKey: string }) => {
      return EventRepository.deleteEventTransformation(payload.eventKey);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.eventTranformation(payload.eventKey) });

      const previousTransformation = queryClient.getQueryData<EventTransformation | null>(
        eventKeys.eventTranformation(payload.eventKey)
      );

      queryClient.removeQueries({ queryKey: eventKeys.eventTranformation(payload.eventKey) });
      return { previousTransformation };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables,
        },
        tags: { type: 'UpsertEventTransformation', scope: 'events' },
      });
      if (context?.previousTransformation) {
        queryClient.setQueryData(eventKeys.eventTranformation(variables.eventKey), context.previousTransformation);
      }
    }
  });

export const useUpsertEventTransformation = () =>
  useMutation({
    mutationFn: async (payload: {
      eventKey: string;
      userId: string;
      leadTime: Duration;
      newTitle: string;
      newDescription: string;
      newGroupId: string | null;
      disableAnswerDeadline: boolean;
      trigger: TransformationTrigger;
      oneTime: boolean;
    }) => {
      return EventRepository.upsertEventTransformation({
        eventKey: payload.eventKey,
        userId: payload.userId,
        leadTime: durationToPostgresInterval(payload.leadTime),
        newTitle: payload.newTitle,
        newDescription: payload.newDescription,
        newGroupId: payload.newGroupId,
        disableAnswerDeadline: payload.disableAnswerDeadline,
        trigger: payload.trigger,
        oneTime: payload.oneTime,
      });
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.eventTranformation(payload.eventKey) });

      const previousTransformation = queryClient.getQueryData<EventTransformation | null>(
        eventKeys.eventTranformation(payload.eventKey)
      );

      if (previousTransformation) {
        const updatedTransformation = {
          ...previousTransformation,
          lead_time: durationToPostgresInterval(payload.leadTime),
          next: {
            title: payload.newTitle,
            description: payload.newDescription,
            group: payload.newGroupId,
            disableAnswerDeadline: payload.disableAnswerDeadline,
          },
          one_time: payload.oneTime,
          active: true,
          trigger: payload.trigger,
        };

        queryClient.setQueryData(eventKeys.eventTranformation(payload.eventKey), updatedTransformation);
      }
      return { previousTransformation };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables,
        },
        tags: { type: 'UpsertEventTransformation', scope: 'events' },
      });
      if (context?.previousTransformation) {
        queryClient.setQueryData(eventKeys.eventTranformation(variables.eventKey), context.previousTransformation);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.eventTranformation(variables.eventKey) });
    },
  });

export const useUpsetBringPledges = () => {
  return useMutation({
    mutationFn: async ({
      event,
      user,
      items,
    }: {
      event: string;
      user: string;
      items: {
        item_id: string;
        quantity: number;
        status: string;
      }[];
    }) => {
      await EventRepository.upsertBringPledges(event, user, items);
      return null;
    },
    onMutate: async ({ items, event, user }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.eventBringOverview(event) });
      await queryClient.cancelQueries({ queryKey: eventKeys.eventBringPledges(event) });

      const previousBringOverview = queryClient.getQueryData<Tables<'event_bring_overview'>[]>(
        eventKeys.eventBringOverview(event)
      );
      const previousFullPledges = queryClient.getQueryData<FullEventPledges[]>(eventKeys.eventBringPledges(event));

      if (previousBringOverview) {
        const updatedBringOverview = previousBringOverview.map((ev) => {
          return {
            ...ev,
            pledged_qty:
              (ev.pledged_qty ?? 0) + items.filter((x) => x.item_id === ev.item_id).reduce((a, b) => a + b.quantity, 0),
            remaining_qty:
              (ev.remaining_qty ?? 0) -
              items.filter((x) => x.item_id === ev.item_id).reduce((a, b) => a + b.quantity, 0),
          };
        });

        queryClient.setQueryData(eventKeys.eventBringOverview(event), updatedBringOverview);
      }
      if (previousFullPledges) {
        const updatedFullPledges = previousFullPledges.map((x) => {
          const changed = items.find((y) => x.item === y.item_id && x.event === event && x.user.id === user);
          return changed ? { ...x, qty: changed.quantity, status: changed.status } : x;
        });
        queryClient.setQueryData(eventKeys.eventBringPledges(event), updatedFullPledges);
      }
      return { previousBringOverview, previousFullPledges };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables,
        },
        tags: { type: 'UpsertBringPledges', scope: 'events' },
      });
      if (context?.previousBringOverview) {
        queryClient.setQueryData(eventKeys.eventBringOverview(variables.event), context.previousBringOverview);
      }
      if (context?.previousFullPledges) {
        queryClient.setQueryData(eventKeys.eventBringPledges(variables.event), context.previousFullPledges);
      }
    },

    onSettled: (_data, _error, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.eventBringOverview(variables.event) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.eventBringPledges(variables.event) }),
      ]),
  });
};

export const useUpdateAttendanceMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ event, newState, user }: { user: User; event: EventsUserView; newState: EventAttendance }) => {
      return EventRepository.updateAttendance(user.id, event.id!, newState);
    },
    onMutate: async ({ event, newState, user }) => {
      await Promise.all([
        cancelEventLists(),
        queryClient.cancelQueries({ queryKey: eventKeys.eventAttendance(event.id) }),
        queryClient.cancelQueries({ queryKey: eventKeys.event(event.id), exact: true }),
      ]);

      const previousLists = snapshotEventLists();
      const previousAttendance = queryClient.getQueryData<FullAttendance[]>(eventKeys.eventAttendance(event.id));
      const previousEvent = queryClient.getQueryData<EventsUserView | null>(eventKeys.event(event.id));

      updateEventEverywhere(event.id, (ev) => ({ ...ev, user_state: newState }));

      if (previousAttendance) {
        const now = formatDateToDatabase(new Date());
        const exists = previousAttendance.some((x) => x.event === event.id && x.user.id === user.id);
        const updatedAttendance = (
          exists
            ? previousAttendance.map((x) =>
              x.event === event.id && x.user.id === user.id ? { ...x, lastUpdate: now, state: newState } : x
            )
            : [...previousAttendance, { event: event.id, lastUpdate: now, state: newState, user }]
        ) as FullAttendance[];
        queryClient.setQueryData(eventKeys.eventAttendance(event.id), updatedAttendance);
      }

      return { previousLists, previousAttendance, previousEvent, event };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          error,
          userId: variables.user.id,
          userName: variables.user.name,
        },
        tags: { type: 'UpdateEventAttendance', scope: 'events' },
      });
      if (!context) return;
      restoreEventLists(context.previousLists);
      if (context.previousEvent !== undefined) {
        queryClient.setQueryData(eventKeys.event(variables.event.id), context.previousEvent);
      }
      if (context.previousAttendance) {
        queryClient.setQueryData(eventKeys.eventAttendance(variables.event.id!), context.previousAttendance);
      }
    },

    onSettled: (_data, _error, variables) =>
      Promise.all([
        invalidateEventLists(),
        // Prefix match: refreshes the event itself and its attendance.
        queryClient.invalidateQueries({ queryKey: eventKeys.event(variables.event.id) }),
      ]),
  });
};

export const useAddCommentMutation = (user: User) => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({
      event,
      comment,
      reply_to,
    }: {
      event: EventsUserView;
      comment: string;
      reply_to: FullComment | null;
    }) => {
      return EventRepository.insertComment(user, event.id, comment, reply_to?.id ?? null);
    },
    onMutate: async ({ event, comment, reply_to }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.eventComments(event.id) });

      const previousComments = queryClient.getQueryData<FullComment[]>(eventKeys.eventComments(event.id));

      if (previousComments) {
        const newComment = {
          comment,
          user,
          userId: user.id,
          displayName: user.displayName,
          edited: false,
          event: event.id,
          pending: true,
          last_update: formatDateToDatabase(new Date()),
          created_at: formatDateToDatabase(new Date()),
          replies: [],
        };
        const updatedComments = (
          reply_to
            ? previousComments.map((x) =>
              x.id === reply_to.id ? { ...x, replies: [...x.replies, { ...newComment, reply_to: reply_to.id }] } : x
            )
            : [...previousComments, { ...newComment, reply_to: null }]
        ) as FullComment[];

        queryClient.setQueryData(eventKeys.eventComments(event.id), updatedComments);
      }

      return { previousComments, eventId: event.id };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          error,
          comment: variables.comment,
          userId: user.id,
          userName: user.name,
        },
        tags: { type: 'AddEventComment', scope: 'events' },
      });
      if (context?.previousComments) {
        queryClient.setQueryData(eventKeys.eventComments(context.eventId), context.previousComments);
      }
    },

    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({ queryKey: eventKeys.eventComments(variables.event.id) }),
  });
};

export const useCancelTrainingMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ event, isCancelled }: { event: EventsUserView; isCancelled: boolean }) => {
      return EventRepository.updateCancellationForEvent(event.id, isCancelled);
    },
    onMutate: async ({ event, isCancelled }) => {
      await Promise.all([
        cancelEventLists(),
        queryClient.cancelQueries({ queryKey: eventKeys.event(event.id), exact: true }),
      ]);

      const previousLists = snapshotEventLists();
      const previousEvent = queryClient.getQueryData<EventsUserView | null>(eventKeys.event(event.id));

      updateEventEverywhere(event.id, (ev) => ({ ...ev, isCancelled }));

      return { previousLists, previousEvent, event };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          error,
        },
        tags: { type: 'CancelEvent', scope: 'events' },
      });
      if (!context) return;
      restoreEventLists(context.previousLists);
      if (context.previousEvent !== undefined) {
        queryClient.setQueryData(eventKeys.event(context.event.id), context.previousEvent);
      }
    },

    onSettled: () => invalidateEvents(),
  });
};

export const useDeleteTrainingMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({ event, type }: { event: EventsUserView; type: DeleteEventType; currentUser: User }) => {
      if (type === 'This Event') {
        await EventRepository.deleteEvent(event.id);
      } else {
        // End the series going forward; the expander prunes (or cancels, if attended) the
        // now-removed future occurrences so they are not regenerated.
        await EventRepository.endSeriesByKey(event.key, event.startingDateTime);
      }
    },
    onMutate: async ({ event, type }) => {
      await cancelEventLists();

      const previousLists = snapshotEventLists();

      const isDeleted = (x: EventsUserView) =>
        type === 'This Event'
          ? x.id === event.id
          : x.key === event.key && !isBefore(x.startingDateTime, event.startingDateTime);

      updateEventLists((events) => events.filter((x) => !isDeleted(x)));

      return { previousLists, event };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          userId: variables.currentUser.id,
          userName: variables.currentUser.name,
          error,
        },
        tags: { type: 'DeleteEvent', scope: 'events' },
      });
      if (context) restoreEventLists(context.previousLists);
    },

    onSettled: (_data, error, variables) =>
      // Don't refetch the deleted event's detail queries (they would 404 while the page is still mounted).
      invalidateEvents(error ? undefined : variables.event.id),
  });
};

export const useInsertEventMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({
      event,
      items,
    }: {
      event: TablesInsert<'events'>;
      items: { name: string; required_qty: number; unit: string; notes: string | null; sort_order: number }[];
      currentUser: User;
    }) => {
      return EventRepository.insertEventWithBringItems(event, items);
    },
    // No optimistic insert: the server assigns the id and decides visibility (RLS), so wait for the
    // refetch instead of showing (and persisting) a placeholder that may disappear later.
    onError: (err, _vars) => {
      captureException(err, {
        extra: {
          ..._vars,
          error: err,
        },
        tags: { type: 'InsertEvent', scope: 'events' },
      });
    },
    onSettled: () => invalidateEvents(),
  });
};

export type EventUpdateItems = Array<{
  id?: string | null;
  name: string;
  required_qty: number | null;
  unit: string;
  notes: string | null;
  sort_order: number;
}>;

export const useUpdateSingleMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({
      eventChanges,
      id,
      items,
    }: {
      id: string;
      eventChanges: TablesUpdate<'events'>;
      currentUser: User;
      items?: EventUpdateItems;
    }) => {
      const result = await EventRepository.updateSingleEvent(id, eventChanges);
      if (items !== undefined) {
        await EventRepository.syncEventBringItems(id, items);
      }
      return result;
    },
    onMutate: async ({ eventChanges, id }) => {
      await Promise.all([cancelEventLists(), queryClient.cancelQueries({ queryKey: eventKeys.event(id), exact: true })]);

      const previousLists = snapshotEventLists();
      const previousEvent = queryClient.getQueryData<EventsUserView | null>(eventKeys.event(id));

      const optimistic = toOptimisticChanges(eventChanges);
      updateEventEverywhere(id, (ev) => ({ ...ev, ...optimistic }));

      return { previousLists, previousEvent };
    },
    onError: (err, _vars, context) => {
      captureException(err, {
        extra: {
          ..._vars,
          error: err,
        },
        tags: { type: 'UpdateSingleEvent', scope: 'events' },
      });
      if (!context) return;
      restoreEventLists(context.previousLists);
      if (context.previousEvent !== undefined) {
        queryClient.setQueryData(eventKeys.event(_vars.id), context.previousEvent);
      }
    },
    onSettled: () => invalidateEvents(),
  });
};

export const useUpdateRecurrenceMutation = () => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({
      eventChanges,
      key,
      originalStartingDateTime,
      items,
    }: {
      key: string;
      /** Start of the edited occurrence *before* the change; anchors "this and following events". */
      originalStartingDateTime: string;
      eventChanges: TablesUpdate<'events'>;
      currentUser: User;
      items?: EventUpdateItems;
    }) => {
      const results = await EventRepository.updateEventAndAllRecurrences(eventChanges, key, originalStartingDateTime);
      if (items !== undefined) {
        const itemsWithoutIds = items.map(({ name, required_qty, unit, notes, sort_order }) => ({
          name,
          required_qty,
          unit,
          notes,
          sort_order,
        }));
        await Promise.all(results.map(({ id }) => EventRepository.syncEventBringItems(id, itemsWithoutIds)));
      }
      return results;
    },
    onMutate: async ({ eventChanges, key, originalStartingDateTime }) => {
      await cancelEventLists();

      const previousLists = snapshotEventLists();

      // Dates are shifted per occurrence on the server, so only apply non-date fields optimistically.
      const optimistic = toOptimisticChanges(eventChanges, { includeDates: false });
      updateEventLists((events) =>
        events.map((x) =>
          x.key === key && !isBefore(x.startingDateTime, originalStartingDateTime) ? { ...x, ...optimistic } : x
        )
      );

      return { previousLists };
    },
    onError: (err, _vars, context) => {
      captureException(err, {
        extra: {
          ..._vars,
          error: err,
        },
        tags: { type: 'UpdateEventRecurrence', scope: 'events' },
      });
      if (context) restoreEventLists(context.previousLists);
    },
    onSettled: () => invalidateEvents(),
  });
};
