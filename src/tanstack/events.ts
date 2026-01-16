import { DeleteEventType } from '@/features/events/types';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { SupabaseEventRepository } from '@/repository/EventRepository';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { EventsUserView, FullAttendance, FullComment } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { captureException, logger } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, isAfter, isBefore } from 'date-fns';

export const fetchFullEventPledges = (eventId: string) =>
  supabase.from('event_bring_pledges').select('*, user: user(*), item: event_bring_items(*)').eq('event', eventId);

export const useEvents = (filter: 'past' | 'upcoming') => {
  return useQuery<EventsUserView[]>({
    queryKey: ['events', filter],
    queryFn: () => SupabaseEventRepository.fetchUserEvents(filter)
  });
};

export const useComments = (eventId: string) =>
  useQuery({
    queryKey: ['events', eventId, 'comments'],
    queryFn: async () => {
      const result = await supabase
        .from('event_comments')
        .select('user(id, displayName, avatarUrl), *')
        .eq('event', eventId)
        .order('last_update', { ascending: false })
        .returns<FullComment[]>()
        .throwOnError();

      const mainComments = (result.data ?? [])
        .filter((x) => !x.reply_to)
        .map((x) => ({
          ...x,
          replies: (result.data ?? []).filter((y) => y.reply_to === x.id),
        }));

      return mainComments;
    },
  });

export const useBringOverview = (eventId: string) =>
  useQuery<Tables<'event_bring_overview'>[]>({
    queryKey: ['events', eventId, 'bringOverview'],
    queryFn: async () => {
      const result = await supabase.from('event_bring_overview').select('*').eq('event', eventId);

      return result.data ?? [];
    },
  });

export const useBringItems = (eventId?: string) =>
  useQuery<BringItems[]>({
    queryKey: ['events', eventId, 'bringPledges'],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!eventId) return [];
      const result = await supabase.from('event_bring_items').select('*').eq('event', eventId);

      return result.data ?? [];
    },
  });

export const useBringPledges = (eventId: string) =>
  useQuery<FullEventPledges[]>({
    queryKey: ['events', eventId, 'bringPledges'],
    queryFn: async () => {
      const result = await fetchFullEventPledges(eventId);

      return result.data ?? [];
    },
  });

export const useAttendance = (eventId: string) =>
  useQuery({
    queryKey: ['events', eventId, 'attendance'],
    queryFn: async () => {
      const result = await supabase
        .from('event_attendance_user_mapping')
        .select('user(id, displayName, avatarUrl, name), *')
        .eq('event', eventId)
        .returns<FullAttendance[]>()
        .throwOnError();

      return result.data ?? [];
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
      await supabase
        .from('event_bring_pledges')
        .delete()
        .eq('event', event)
        .eq('user_id', user)
        .in(
          'item',
          items.filter((x) => x.quantity <= 0).map((x) => x.item_id)
        );
      await supabase.from('event_bring_pledges').upsert(
        items
          .filter((x) => x.quantity > 0)
          .map((x) => ({
            event: event,
            user_id: user,
            qty: x.quantity,
            status: x.status,
            item: x.item_id,
          })),
        { onConflict: 'user_id, item' }
      );
      return null;
    },
    onMutate: async ({ items, event, user }) => {
      await queryClient.cancelQueries({ queryKey: ['events', event, 'bringOverview'] });
      await queryClient.cancelQueries({ queryKey: ['events', event, 'bringPledges'] });

      const previousBringOverview = queryClient.getQueryData<Tables<'event_bring_overview'>[]>([
        'events',
        event,
        'bringOverview',
      ]);
      const previousFullPledges = queryClient.getQueryData<FullEventPledges[]>(['events', event, 'bringPledges']);

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

        queryClient.setQueryData(['events', event, 'bringOverview'], updatedBringOverview);
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
        queryClient.setQueryData(['events', event, 'bringPledges'], updatedFullPledges);
      }
      return { previousBringOverview, previousFullPledges };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables
        },
        tags: { type: 'UpsertBringPledges', scope: 'events' },
      });
      if (context?.previousBringOverview) {
        queryClient.setQueryData(['events', variables.event, 'bringOverview'], context.previousBringOverview);
      }
      if (context?.previousFullPledges) {
        queryClient.setQueryData(['events', variables.event, 'bringPledges'], context.previousFullPledges);
      }
    },

    onSettled: (_data, _error, variables, _context) => {
      logger.info('Event pledges upsertd successfully.', {
        event: variables.event,
        items: variables.items,
        user: variables.user,
      });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event, 'bringOverview'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event, 'bringPledges'] });
    },
  });
};

export const useUpdateAttendanceMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: ({ event, newState, user }: { user: User; event: EventsUserView; newState: EventAttendance }) => {
      return SupabaseEventRepository.updateAttendance(user.id, event.id!, newState);
    },
    onMutate: async ({ event, newState, user }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });
      await queryClient.cancelQueries({ queryKey: ['events', event.id, 'attendance'] });
      await queryClient.cancelQueries({ queryKey: ['events', event.id] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);
      const previousAttendance = queryClient.getQueryData<FullAttendance[]>(['events', event.id, 'attendance']);
      const previousEvent = queryClient.getQueryData<FullAttendance[]>(['events', event.id]);

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

        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          user_state: newState,
        };

        queryClient.setQueryData(['events', event.id], updatedEvent);
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
          queryClient.setQueryData(['events', event.id, 'attendance'], updatedAttendance);
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
          queryClient.setQueryData(['events', event.id, 'attendance'], updatedAttendance);
        }
      }

      return { previousEvents, previousAttendance, event };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          event: variables.event.id,
          eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
          error,
          userId: variables.user.id,
          userName: variables.user.name
        },
        tags: { type: 'UpdateEventAttendanc', scope: 'events' },
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
      if (context?.previousAttendance) {
        queryClient.setQueryData(['events', variables.event.id!, 'attendance'], context.previousAttendance);
      }
    },

    onSettled: (_data, _error, variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event.id!, 'attendance'] });
    },
  });
};

export const useAddCommentMutation = (user: User) => {
  return useMutation({
    mutationFn: ({
      event,
      comment,
      reply_to,
    }: {
      event: EventsUserView;
      comment: string;
      reply_to: FullComment | null;
    }) => {
      return SupabaseEventRepository.insertComment(user, event.id, comment, reply_to?.id ?? null);
    },
    onMutate: async ({ event, comment, reply_to }) => {
      await queryClient.cancelQueries({ queryKey: ['events', event.id, 'comments'] });

      const previousComments = queryClient.getQueryData<FullComment[]>(['events', event.id, 'comments']);

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

          queryClient.setQueryData(['events', event.id, 'comments'], updatedComments);
        } else {
          const updatedComments = [
            ...previousComments,
            {
              ...newComment,
              reply_to,
            },
          ] as FullComment[];

          queryClient.setQueryData(['events', event.id, 'comments'], updatedComments);
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
          userName: user.name
        },
        tags: { type: 'AddEventComment', scope: 'events' },
      });
      if (context?.previousComments) {
        queryClient.setQueryData(['events', context.eventId, 'comments'], context.previousComments);
      }
    },

    onSettled: (_data, _error, variables, context) => {
      if (context?.eventId) queryClient.invalidateQueries({ queryKey: ['events', context.eventId, 'comments'] });
    },
  });
};

export const useCancelTrainingMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: ({ event, isCancelled }: { event: EventsUserView; isCancelled: boolean }) => {
      return SupabaseEventRepository.updateCancellationForEvent(event.id, isCancelled);
    },
    onMutate: async ({ event, isCancelled }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });
      await queryClient.cancelQueries({ queryKey: ['events', event.id] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);
      const previousEvent = queryClient.getQueryData<EventsUserView>(['events', event.id]);

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

        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          isCancelled: isCancelled,
        };

        queryClient.setQueryData(['events', event.id], updatedEvent);
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
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['events', variables.event.id], context.previousEvent);
      }
    },

    onSettled: (_data, _error, variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event.id!] });
    },
  });
};

export const useDeleteTrainingMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: ({ event, type }: { event: EventsUserView; type: DeleteEventType; currentUser: User }) => {
      if (type === 'This Event') {
        return SupabaseEventRepository.deleteEvent(event.id);
      } else {
        return SupabaseEventRepository.deleteEventAndUpcomingEvents(event.id, event.key, event.startingDateTime);
      }
    },
    onMutate: async ({ event, type }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);

      if (previousEvents) {
        if (type === 'This Event') {
          const updatedEvents = previousEvents.filter((x) => x.id !== event.id);
          queryClient.setQueryData(['events', fetchMode], updatedEvents);
        } else if (type === 'This and following events') {
          const updatedEvents = previousEvents.filter(
            (x) => x.key !== event.key && !isBefore(x.startingDateTime, event.startingDateTime)
          );

          queryClient.setQueryData(['events', fetchMode], updatedEvents);
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
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
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
      const result = await supabase
        .rpc('insert_event_with_bring_items', {
          p_event: event,
          p_items: items,
        })
        .throwOnError();
      return result.data;
    },
    onMutate: async ({ event }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);

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
        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      return { previousEvents, event };
    },
    onError: (err, _vars, context) => {
      logger.error('event_creation_failed', {
        type: 'event_creation',
        message: 'event_creation_failed',
        origin: 'ui',
        event: _vars.event.id,
        user: JSON.stringify(_vars.currentUser),
        eventDate: format(_vars.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        error: JSON.stringify(err),
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },
    onSettled: (_data, _error, variables, _context) => {
      logger.info('event_creation_successful', {
        type: 'event_creation',
        message: 'event_creation_successful',
        event: variables.event.id,
        user: JSON.stringify(variables.currentUser),
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
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
      const result = await supabase.from('events').update(eventChanges).eq('id', id).select().throwOnError();
      return result.data;
    },
    onMutate: async ({ eventChanges, id }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });
      await queryClient.cancelQueries({ queryKey: ['events', id] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);
      const previousEvent = queryClient.getQueryData<EventsUserView>(['events', id]);

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          ...eventChanges,
        };

        queryClient.setQueryData(['events', id], updatedEvent);
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
        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      return { previousEvents, previousEvent };
    },
    onError: (err, _vars, context) => {
      logger.error('event_update_single_failed', {
        type: 'event_update_single',
        message: 'event_update_single_failed',
        changes: _vars.eventChanges,
        key: _vars.id,
        user: JSON.stringify(_vars.currentUser),
        error: JSON.stringify(err),
        origin: 'ui',
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['events', _vars.id], context.previousEvent);
      }
    },
    onSettled: (_data, _error, variables, _context) => {
      logger.info('event_update_single_successful', {
        type: 'event_update_single',
        message: 'event_update_single_successful',
        changes: variables.eventChanges,
        id: variables.id,
        user: JSON.stringify(variables.currentUser),
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
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
      return await SupabaseEventRepository.updateEventAndAllRecurrences(eventChanges, key, startingDateTime);
    },
    onMutate: async ({ eventChanges, key, startingDateTime }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);

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
        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      return { previousEvents };
    },
    onError: (err, _vars, context) => {
      logger.error('event_update_recurrence_failed', {
        type: 'event_update_recurrence',
        message: 'event_update_recurrence_failed',
        changes: _vars.eventChanges,
        key: _vars.key,
        user: JSON.stringify(_vars.currentUser),
        error: JSON.stringify(err),
        eventDate: format(_vars.startingDateTime, 'dd.MM.yyyy HH:mm'),
        origin: 'ui',
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },
    onSettled: (_data, _error, variables, _context) => {
      logger.info('event_update_recurrence_successful', {
        type: 'event_update_recurrence',
        message: 'event_update_recurrence_successful',
        changes: variables.eventChanges,
        user: JSON.stringify(variables.currentUser),
        key: variables.key,
        eventDate: format(variables.startingDateTime, 'dd.MM.yyyy HH:mm'),
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
    },
  });
};
