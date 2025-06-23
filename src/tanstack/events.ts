import { useMutation, useQuery } from "@tanstack/react-query"
import { isAfter } from "date-fns"
import { queryClient } from "src/App"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { DeleteEventType } from "src/features/events/types"
import { SupabaseEventRepository } from "src/repository/EventRepository"
import { TablesInsert, TablesUpdate } from "src/types/supabase-generated.types"
import { EventsUserView, FullAttendance, FullComment } from "src/types/supabaseTypes"
import { formatDateToDatabase } from "src/utils"


export const useEvents = (filter: 'past' | 'upcoming') => {
  return useQuery<EventsUserView[]>({
    queryKey: ["events", filter],
    queryFn: () => SupabaseEventRepository.fetchUserEvents(filter)
  })
}

export const useComments = (eventId: string) => useQuery({
  queryKey: ["events", eventId, "comments"],
  queryFn: async () => {
    const result = await supabase
      .from('event_comments')
      .select('user(userId, displayName, avatarUrl), *')
      .eq('event', eventId)
      .order("last_update", { ascending: false })
      .returns<FullComment[]>()
      .throwOnError();

    let mainComments = (result.data ?? [])
      .filter((x) => !x.reply_to)
      .map((x) => ({
        ...x,
        replies: (result.data ?? []).filter((y) => y.reply_to === x.id),
      }));

    return mainComments;
  }
});

export const useAttendance = (eventId: string) => useQuery({
  queryKey: ["events", eventId, "attendance"],
  queryFn: async () => {
    const result = await supabase
      .from('event_attendance_user_mapping')
      .select('user(userId, displayName, avatarUrl, name), *')
      .eq('event', eventId)
      .returns<FullAttendance[]>()
      .throwOnError();

    return result.data ?? [];
  }
});

export const useUpdateAttendanceMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: ({ event, newState, user }: { user: User, event: EventsUserView; newState: EventAttendance }) => {
      return SupabaseEventRepository.updateAttendance(user.userId, event.id!, newState)
    },
    onMutate: async ({ event, newState, user }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });
      await queryClient.cancelQueries({ queryKey: ["events", event.id, "attendance"] });
      await queryClient.cancelQueries({ queryKey: ["events", event.id] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);
      const previousAttendance = queryClient.getQueryData<FullAttendance[]>(["events", event.id, "attendance"]);
      const previousEvent = queryClient.getQueryData<FullAttendance[]>(["events", event.id]);

      if (previousEvents) {
        const updatedEvents = previousEvents.map(ev => {
          if (ev.id === event.id) {
            return {
              ...ev,
              user_state: newState,
            };
          }
          return ev;
        });

        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          user_state: newState
        }

        queryClient.setQueryData(["events", event.id], updatedEvent);
      }

      if (previousAttendance) {
        const attendance = previousAttendance.find(x => x.event === event.id && x.user === user.userId);
        if (!attendance) {
          const updatedAttendance = [
            ...previousAttendance,
            {
              event: event.id,
              lastUpdate: formatDateToDatabase(new Date()),
              state: newState,
              user: user
            }
          ] as FullAttendance[];
          queryClient.setQueryData(["events", event.id, "attendance"], updatedAttendance);
        } else {
          const updatedAttendance = previousAttendance.map(x => {
            if (x.event === attendance.event && x.user === user.userId) {
              return {
                event: event.id,
                lastUpdate: formatDateToDatabase(new Date()),
                state: newState,
                user: user
              }
            } else {
              return x
            }
          })
          queryClient.setQueryData(["events", event.id, "attendance"], updatedAttendance);
        }

      }

      return { previousEvents, previousAttendance, event }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
      if (context?.previousAttendance) {
        queryClient.setQueryData(["events", _vars.event.id!, "attendance"], context.previousAttendance);
      }
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.event.id!, "attendance"] });
    },
  })
}

export const useAddCommentMutation = (user: User) => {
  return useMutation({
    mutationFn: ({ eventId, comment, reply_to }: { eventId: string, comment: string, reply_to: FullComment | null }) => {
      return SupabaseEventRepository.insertComment(user, eventId, comment, reply_to?.id ?? null)
    },
    onMutate: async ({ eventId, comment, reply_to }) => {
      await queryClient.cancelQueries({ queryKey: ["events", eventId, "comments"] });

      const previousComments = queryClient.getQueryData<FullComment[]>(["events", eventId, "comments"]);

      if (previousComments) {
        const newComment = {
          comment,
          user,
          userId: user.userId,
          displayName: user.displayName,
          edited: false,
          event: eventId,
          pending: true,
          last_update: formatDateToDatabase(new Date()),
          created_at: formatDateToDatabase(new Date()),
          replies: []
        }
        if (reply_to) {
          const index = previousComments.findIndex(x => x.id === reply_to.id);
          const updatedComments = [
            ...previousComments.splice(0, index),
            {
              ...reply_to,
              replies: [
                ...reply_to.replies,
                {
                  ...newComment,
                  reply_to: reply_to.id,
                }
              ]
            },
            ...previousComments.splice(index)
          ] as FullComment[];

          queryClient.setQueryData(["events", eventId, "comments"], updatedComments);
        } else {
          const updatedComments = [
            ...previousComments,
            {
              ...newComment,
              reply_to,
            }
          ] as FullComment[];

          queryClient.setQueryData(["events", eventId, "comments"], updatedComments);
        }
      }

      return { previousComments, eventId }
    },
    onError: (err, _vars, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["events", context.eventId, "comments"], context.previousComments);
      }
    },

    onSettled: (context) => {
      if (context?.event)
        queryClient.invalidateQueries({ queryKey: ["events", context.event, "comments"] });
    },
  })
}

export const useCancelTrainingMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: ({ event, isCancelled }: { event: EventsUserView, isCancelled: boolean }) => {
      return SupabaseEventRepository.updateCancellationForEvent(event.id, isCancelled)
    },
    onMutate: async ({ event, isCancelled }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });
      await queryClient.cancelQueries({ queryKey: ["events", event.id] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);
      const previousEvent = queryClient.getQueryData<EventsUserView>(["events", event.id]);

      if (previousEvents) {
        const updatedEvents = previousEvents.map(ev => {
          if (ev.id === event.id) {
            return {
              ...ev,
              isCancelled: isCancelled
            };
          }
          return ev;
        });

        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      if (previousEvent) {
        const updatedEvent = {
          ...previousEvent,
          isCancelled: isCancelled
        }

        queryClient.setQueryData(["events", event.id], updatedEvent);
      }

      return { previousEvents, previousEvent, event }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(["events", _vars.event.id], context.previousEvent);
      }
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.event.id!] });
    },
  })
}

export const useDeleteTrainingMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: ({ event, type }: { event: EventsUserView, type: DeleteEventType }) => {
      if (type === "This Event") {
        return SupabaseEventRepository.deleteEvent(event.id)
      } else {
        return SupabaseEventRepository.deleteEventAndUpcomingEvents(
          event.id,
          event.key,
          event.startingDateTime
        )
      }
    },
    onMutate: async ({ event, type }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);

      if (previousEvents) {
        const updatedEvents = previousEvents.filter(x => x.id !== event.id)

        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      return { previousEvents, event }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
    },
  })
}

export const useInsertEventMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: async ({ event }: { event: TablesInsert<"events"> }) => {
      const result = await SupabaseEventRepository.insertEvent(event);
      return result.data;
    },
    onMutate: async ({ event }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);

      if (previousEvents) {
        const updatedEvents = [
          ...previousEvents,
          {
            ...event,
            attending_count: 0,
            declined_count: 0,
            user_state: null
          }
        ] as EventsUserView[]
        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      return { previousEvents, event }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
    },
  })
}

export const useUpdateSingleMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: async ({ eventChanges, id }: { id: string, eventChanges: TablesUpdate<"events"> }) => {
      const result = await SupabaseEventRepository.updateEvent(id, eventChanges);
      return result.data;
    },
    onMutate: async ({ eventChanges, id }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);

      if (previousEvents) {
        const updatedEvents = previousEvents.map(x => {
          if (x.id === id) {
            return {
              ...x,
              ...eventChanges
            }
          }
          return x
        }) as EventsUserView[]
        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      return { previousEvents }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
    },
  })
}

export const useUpdateRecurrenceMutation = (fetchMode: "past" | "upcoming") => {
  return useMutation({
    mutationFn: async ({ eventChanges, key, startingDateTime }: { key: string, startingDateTime: string, eventChanges: TablesUpdate<"events"> }) => {
      return await SupabaseEventRepository.updateEventAndAllRecurrences(
        eventChanges,
        key,
        startingDateTime
      )
    },
    onMutate: async ({ eventChanges, key, startingDateTime }) => {
      await queryClient.cancelQueries({ queryKey: ["events", fetchMode] });

      const previousEvents = queryClient.getQueryData<EventsUserView[]>(["events", fetchMode]);

      if (previousEvents) {
        const updatedEvents = previousEvents.map(x => {
          if (x.key === key && isAfter(x.startingDateTime, startingDateTime)) {
            return {
              ...x,
              ...eventChanges
            }
          }
          return x
        }) as EventsUserView[]
        queryClient.setQueryData(["events", fetchMode], updatedEvents);
      }

      return { previousEvents }
    },
    onError: (err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events", fetchMode], context.previousEvents);
      }
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["events", fetchMode] });
    },
  })
}