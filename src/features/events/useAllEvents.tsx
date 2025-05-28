import { useMutation, useQuery } from "@tanstack/react-query"
import { formatDate } from "date-fns"
import { queryClient } from "src/App"
import { SupabaseEventRepository } from "src/repository/EventRepository"
import { EventsUserView, FullAttendance, FullComment } from "src/types/supabaseTypes"
import { formatDateToDatabase } from "src/utils"


export const useEvents = (filter: 'past' | 'upcoming') => {
  return useQuery<EventsUserView[]>({
    queryKey: ["events", filter],
    queryFn: () => SupabaseEventRepository.fetchUserEvents(filter)
  })
}

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