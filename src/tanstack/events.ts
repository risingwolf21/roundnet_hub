import { TransformationTrigger } from '@/features/events/dialogs/TransformEventDialog';
import { DeleteEventType } from '@/features/events/types';
import { queryClient } from '@/lib/queryClient';
import { EventRepository } from '@/repository/EventRepository';
import { GamesRepository } from '@/repository/GamesRepository';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { EventsUserView, FullAttendance, FullComment } from '@/types/supabaseTypes';
import { durationToPostgresInterval, formatDateFromDatabaseNotNull, formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Duration, format, isAfter, isBefore } from 'date-fns';

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
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.list("upcoming") });
  }
});

export const useEventMatches = (eventId: string) =>
  useQuery<FullMatch[]>({
    queryKey: eventKeys.eventMatches(eventId),
    queryFn: () => GamesRepository.fetchGamesForEvent(eventId),
  });

export const useComments = (eventId: string) =>
  useQuery({
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
          return items.map((y) => {
            if (x.item === y.item_id && x.event === event && x.user.id === user) {
              return {
                ...x,
                qty: y.quantity,
                status: y.status,
              };
            } else {
              return x;
            }
          });
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

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.eventBringOverview(variables.event) });
      queryClient.invalidateQueries({ queryKey: eventKeys.eventBringPledges(variables.event) });
    },
  });
};

export const useUpdateAttendanceMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ event, newState, user }: { user: User; event: EventsUserView; newState: EventAttendance }) => {
      return EventRepository.updateAttendance(user.id, event.id!, newState);
    },
    onMutate: async ({ event, newState, user }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });
      await queryClient.cancelQueries({ queryKey: eventKeys.eventAttendance(event.id) });
      await queryClient.cancelQueries({ queryKey: eventKeys.event(event.id) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));
      const previousAttendance = queryClient.getQueryData<FullAttendance[]>(eventKeys.eventAttendance(event.id));
      const previousEvent = queryClient.getQueryData<FullAttendance[]>(eventKeys.event(event.id));
      if (previousEvents) {
        const updatedEvents = previousEvents.map((ev) => {
          if (ev.id === event.id) {
            return {
              ...ev,
              user_state: newState,
            };
          }
          return ev;
        });

        queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          user_state: newState,
        };

        queryClient.setQueryData(eventKeys.event(event.id), updatedEvent);
      }

      if (previousAttendance) {
        const attendance = previousAttendance.find((x) => x.event === event.id && x.user === user.id);
        if (!attendance) {
          const updatedAttendance = [
            ...previousAttendance,
            {
              event: event.id,
              lastUpdate: formatDateToDatabase(new Date()),
              state: newState,
              user: user,
            },
          ] as FullAttendance[];
          queryClient.setQueryData(eventKeys.eventAttendance(event.id), updatedAttendance);
        } else {
          const updatedAttendance = previousAttendance.map((x) => {
            if (x.event === attendance.event && x.user === user.id) {
              return {
                event: event.id,
                lastUpdate: formatDateToDatabase(new Date()),
                state: newState,
                user: user,
              };
            } else {
              return x;
            }
          });
          queryClient.setQueryData(eventKeys.eventAttendance(event.id), updatedAttendance);
        }
      }

      return { previousEvents, previousAttendance, previousEvent, event };
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
        tags: { type: 'UpdateEventAttendanc', scope: 'events' },
      });
      if (context?.previousEvent) {
        queryClient.setQueryData(eventKeys.event(variables.event.id), context.previousEvent);
      }
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
      if (context?.previousAttendance) {
        queryClient.setQueryData(eventKeys.eventAttendance(variables.event.id!), context.previousAttendance);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
      queryClient.invalidateQueries({ queryKey: eventKeys.eventAttendance(variables.event.id!) });
    },
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
        if (reply_to) {
          const index = previousComments.findIndex((x) => x.id === reply_to.id);
          const updatedComments = [
            ...previousComments.splice(0, index),
            {
              ...reply_to,
              replies: [
                ...reply_to.replies,
                {
                  ...newComment,
                  reply_to: reply_to.id,
                },
              ],
            },
            ...previousComments.splice(index),
          ] as FullComment[];

          queryClient.setQueryData(eventKeys.eventComments(event.id), updatedComments);
        } else {
          const updatedComments = [
            ...previousComments,
            {
              ...newComment,
              reply_to,
            },
          ] as FullComment[];

          queryClient.setQueryData(eventKeys.eventComments(event.id), updatedComments);
        }
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

    onSettled: (_data, _error, _variables, context) => {
      if (context?.eventId) queryClient.invalidateQueries({ queryKey: eventKeys.eventComments(context.eventId) });
    },
  });
};

export const useCancelTrainingMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ event, isCancelled }: { event: EventsUserView; isCancelled: boolean }) => {
      return EventRepository.updateCancellationForEvent(event.id, isCancelled);
    },
    onMutate: async ({ event, isCancelled }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });
      await queryClient.cancelQueries({ queryKey: eventKeys.event(event.id) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));
      const previousEvent = queryClient.getQueryData<EventsUserView>(eventKeys.event(event.id));
      if (previousEvents) {
        const updatedEvents = previousEvents.map((ev) => {
          if (ev.id === event.id) {
            return {
              ...ev,
              isCancelled: isCancelled,
            };
          }
          return ev;
        });

        queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          isCancelled: isCancelled,
        };

        queryClient.setQueryData(eventKeys.event(event.id), updatedEvent);
      }

      return { previousEvents, previousEvent, event };
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
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(eventKeys.event(context.event.id), context.previousEvent);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
      queryClient.invalidateQueries({ queryKey: eventKeys.event(variables.event.id!) });
    },
  });
};

export const useDeleteTrainingMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ event, type }: { event: EventsUserView; type: DeleteEventType; currentUser: User }) => {
      if (type === 'This Event') {
        return EventRepository.deleteEvent(event.id);
      } else {
        return EventRepository.deleteEventAndUpcomingEvents(event.id, event.key, event.startingDateTime);
      }
    },
    onMutate: async ({ event, type }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));

      if (previousEvents) {
        if (type === 'This Event') {
          const updatedEvents = previousEvents.filter((x) => x.id !== event.id);
          queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
        } else if (type === 'This and following events') {
          const updatedEvents = previousEvents.filter(
            (x) => x.key !== event.key && !isBefore(x.startingDateTime, event.startingDateTime)
          );

          queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
        }
      }

      return { previousEvents, event };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          fetchMode: fetchMode,
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          userId: variables.currentUser.id,
          userName: variables.currentUser.name,
          error,
        },
        tags: { type: 'DeleteEvent', scope: 'events' },
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
    },
  });
};

export const useInsertEventMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
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
    onMutate: async ({ event }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));

      if (previousEvents) {
        const updatedEvents = [
          ...previousEvents,
          {
            ...event,
            attending_count: 0,
            declined_count: 0,
            user_state: null,
          },
        ] as EventsUserView[];
        queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
      }

      return { previousEvents, event };
    },
    onError: (err, _vars, context) => {
      captureException(err, {
        extra: {
          ..._vars,
          error: err,
        },
        tags: { type: 'InsertEvent', scope: 'events' },
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
    },
  });
};

export const useUpdateSingleMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: async ({
      eventChanges,
      id,
    }: {
      id: string;
      eventChanges: TablesUpdate<'events'>;
      currentUser: User;
    }) => {
      return EventRepository.updateSingleEvent(id, eventChanges);
    },
    onMutate: async ({ eventChanges, id }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });
      await queryClient.cancelQueries({ queryKey: eventKeys.event(id) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));
      const previousEvent = queryClient.getQueryData<EventsUserView>(eventKeys.event(id));

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          ...eventChanges,
        };

        queryClient.setQueryData(eventKeys.event(id), updatedEvent);
      }

      if (previousEvents) {
        const updatedEvents = previousEvents.map((x) => {
          if (x.id === id) {
            return {
              ...x,
              ...eventChanges,
            };
          }
          return x;
        }) as EventsUserView[];
        queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
      }

      return { previousEvents, previousEvent };
    },
    onError: (err, _vars, context) => {
      captureException(err, {
        extra: {
          ...err,
          ..._vars,
        },
        tags: { type: 'UpdateSingleEvent', scope: 'events' },
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(eventKeys.event(_vars.id), context.previousEvent);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
      queryClient.invalidateQueries({ queryKey: eventKeys.event(variables.id) });
    },
  });
};

export const useUpdateRecurrenceMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: async ({
      eventChanges,
      key,
      startingDateTime,
    }: {
      key: string;
      startingDateTime: string;
      eventChanges: TablesUpdate<'events'>;
      currentUser: User;
    }) => {
      return EventRepository.updateEventAndAllRecurrences(eventChanges, key, startingDateTime);
    },
    onMutate: async ({ eventChanges, key, startingDateTime }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(fetchMode) });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(eventKeys.list(fetchMode));

      if (previousEvents) {
        const updatedEvents = previousEvents.map((x) => {
          if (x.key === key && isAfter(x.startingDateTime, startingDateTime)) {
            return {
              ...x,
              ...eventChanges,
            };
          }
          return x;
        }) as EventsUserView[];
        queryClient.setQueryData(eventKeys.list(fetchMode), updatedEvents);
      }

      return { previousEvents };
    },
    onError: (err, _vars, context) => {
      captureException(err, {
        extra: {
          ..._vars,
          error: err,
        },
        tags: { type: 'UpdateEventRecurrence', scope: 'events' },
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.list(fetchMode), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list(fetchMode) });
    },
  });
};
