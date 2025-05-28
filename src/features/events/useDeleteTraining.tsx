import { useMutation } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { SupabaseEventRepository } from "src/repository/EventRepository";
import { EventsUserView } from "src/types/supabaseTypes";
import { DeleteEventType } from "./types";

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