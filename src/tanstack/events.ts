import { logger } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, isAfter } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { DeleteEventType } from '@/features/events/types';
import { SupabaseEventRepository } from '@/repository/EventRepository';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { EventsUserView, FullAttendance, FullComment } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';

export const fetchFullEventPledges = (eventId: String) =>
  supabase.from('event_bring_pledges').select('*, user: user_id(*)').eq('event', eventId);

export const useEvents = (filter: 'past' | 'upcoming') => {
  return useQuery<EventsUserView[]>({
    queryKey: ['events', filter],
    queryFn: () => SupabaseEventRepository.fetchUserEvents(filter),
  });
};

export const useComments = (eventId: string) =>
  useQuery({
    queryKey: ['events', eventId, 'comments'],
    queryFn: async () => {
      const result = await supabase
        .from('event_comments')
        .select('user(userId, displayName, avatarUrl), *')
        .eq('event', eventId)
        .order('last_update', { ascending: false })
        .returns<FullComment[]>()
        .throwOnError();

      let mainComments = (result.data ?? [])
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
        .select('user(userId, displayName, avatarUrl, name), *')
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
      item_id,
      user,
      quantity,
      status,
    }: {
      event: EventsUserView;
      item_id: string | null;
      user: User;
      quantity: number;
      status: string;
    }) => {
      if (item_id === null) return;
      const result = await supabase
        .from('event_bring_pledges')
        .upsert(
          {
            event: event.id,
            user_id: user.userId,
            qty: quantity,
            status: status,
            item: item_id,
          },
          { onConflict: 'user_id, item' }
        )
        .select('*')
        .maybeSingle();

      return result.data;
    },
    onMutate: async ({ event, item_id, user, quantity, status }) => {
      await queryClient.cancelQueries({ queryKey: ['events', event.id, 'bringOverview'] });
      await queryClient.cancelQueries({ queryKey: ['events', event.id, 'bringPledges'] });

      const previousBringOverview = queryClient.getQueryData<Tables<'event_bring_overview'>[]>([
        'events',
        event.id,
        'bringOverview',
      ]);
      const previousFullPledges = queryClient.getQueryData<FullEventPledges[]>(['events', event.id, 'bringPledges']);

      if (previousBringOverview) {
        const updatedBringOverview = previousBringOverview.map((ev) => {
          if (ev.item_id === item_id) {
            return {
              ...ev,
              pledged_qty: (ev.pledged_qty ?? 0) + quantity,
              remaining_qty: (ev.remaining_qty ?? 0) - quantity,
            };
          }
          return ev;
        });

        queryClient.setQueryData(['events', event.id, 'bringOverview'], updatedBringOverview);
      }
      if (previousFullPledges) {
        const updatedFullPledges = previousFullPledges.map((x) => {
          if (x.item === item_id && x.user_id === user.userId && x.event === event.id) {
            return {
              ...x,
              qty: quantity,
              status: status,
            };
          } else {
            return x;
          }
        });
        queryClient.setQueryData(['events', event.id, 'bringPledges'], updatedFullPledges);
      }
      return { previousBringOverview, previousFullPledges };
    },
    onError: (err, variables, context) => {
      logger.error('Event pledges could not be upserted', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        pledge_item: variables.item_id,
        error: err,
      });
      if (context?.previousBringOverview) {
        queryClient.setQueryData(['events', variables.event.id, 'bringOverview'], context.previousBringOverview);
      }
      if (context?.previousFullPledges) {
        queryClient.setQueryData(['events', variables.event.id, 'bringPledges'], context.previousFullPledges);
      }
    },

    onSettled: (data, error, variables, context) => {
      logger.info('Event pledges upsertd successfully.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        pledge_item: variables.item_id,
        qunatity: variables.quantity,
        user: variables.user,
      });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event.id, 'bringOverview'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event.id, 'bringPledges'] });
    },
  });
};

export const useUpdateAttendanceMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: ({ event, newState, user }: { user: User; event: EventsUserView; newState: EventAttendance }) => {
      return SupabaseEventRepository.updateAttendance(user.userId, event.id!, newState);
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
        const attendance = previousAttendance.find((x) => x.event === event.id && x.user === user.userId);
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
            if (x.event === attendance.event && x.user === user.userId) {
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
    onError: (err, variables, context) => {
      logger.error('Attendance update failed.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        userId: variables.user.userId,
        userEmail: variables.user.email,
        newState: variables.newState,
        error: err,
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
      if (context?.previousAttendance) {
        queryClient.setQueryData(['events', variables.event.id!, 'attendance'], context.previousAttendance);
      }
    },

    onSettled: (data, error, variables, context) => {
      logger.info('Attendance update successful.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        userId: variables.user.userId,
        userEmail: variables.user.email,
        newState: variables.newState,
      });
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
          userId: user.userId,
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
    onError: (err, variables, context) => {
      logger.error('Event comment failed.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        userId: user.userId,
        userEmail: user.email,
        comment: variables.comment,
        error: err,
      });
      if (context?.previousComments) {
        queryClient.setQueryData(['events', context.eventId, 'comments'], context.previousComments);
      }
    },

    onSettled: (data, error, variables, context) => {
      logger.info('Event comment successful.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        userId: user.userId,
        userEmail: user.email,
        comment: variables.comment,
      });
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
    onError: (err, variables, context) => {
      logger.error('Event could not be cancelled', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        error: err,
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['events', variables.event.id], context.previousEvent);
      }
    },

    onSettled: (data, error, variables, context) => {
      logger.info('Event cancelled successfully.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.event.id!] });
    },
  });
};

export const useDeleteTrainingMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: ({ event, type }: { event: EventsUserView; type: DeleteEventType }) => {
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
        const updatedEvents = previousEvents.filter((x) => x.id !== event.id);

        queryClient.setQueryData(['events', fetchMode], updatedEvents);
      }

      return { previousEvents, event };
    },
    onError: (err, _vars, context) => {
      logger.error('Deleting event failed.', {
        event: _vars.event.id,
        eventDate: format(_vars.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },

    onSettled: (data, error, variables, context) => {
      logger.info('Deleting event successful.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
    },
  });
};

export const useInsertEventMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: async ({ event }: { event: TablesInsert<'events'> }) => {
      const result = await SupabaseEventRepository.insertEvent(event);
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
      logger.error('Inserting event failed.', {
        event: _vars.event.id,
        eventDate: format(_vars.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        error: err.message,
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      logger.info('Inserting event successful.', {
        event: variables.event.id,
        eventDate: format(variables.event.startingDateTime, 'dd.MM.yyyy HH:mm'),
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
    },
  });
};

export const useUpdateSingleMutation = (fetchMode: 'past' | 'upcoming') => {
  return useMutation({
    mutationFn: async ({ eventChanges, id }: { id: string; eventChanges: TablesUpdate<'events'> }) => {
      const result = await supabase.from('events').update(eventChanges).eq('id', id).select().throwOnError();
      console.log('updateSingleMutation', result);
      return result.data;
    },
    onMutate: async ({ eventChanges, id }) => {
      await queryClient.cancelQueries({ queryKey: ['events', fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(['events', fetchMode]);

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

      return { previousEvents };
    },
    onError: (err, _vars, context) => {
      logger.error('Updating recurring event failed.', {
        changes: _vars.eventChanges,
        key: _vars.id,
        error: err.message,
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      logger.info('Updating single event successful.', {
        changes: variables.eventChanges,
        id: variables.id,
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
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
      logger.error('Updating recurring event failed.', {
        changes: _vars.eventChanges,
        key: _vars.key,
        eventDate: format(_vars.startingDateTime, 'dd.MM.yyyy HH:mm'),
        error: err.message,
      });
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      logger.info('Updating recurring event successful.', {
        changes: variables.eventChanges,
        key: variables.key,
        eventDate: format(variables.startingDateTime, 'dd.MM.yyyy HH:mm'),
        origin: 'ui',
      });
      queryClient.invalidateQueries({ queryKey: ['events', fetchMode] });
    },
  });
};
