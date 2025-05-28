import { useMutation } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { SupabaseEventRepository } from "src/repository/EventRepository";
import { EventsUserView } from "src/types/supabaseTypes";

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