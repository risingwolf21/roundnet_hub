import { toDate } from "date-fns";
import { Event } from "types/supabase";

export const GoogleRepository = {
  async insertEventToCalendar(event: Event, provider_token: string): Promise<Response> {
    const googleEvent = {
      'summary': event.title,
      'description': event.description,
      'start': {
        'dateTime': toDate(event.startingDateTime).toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': toDate(event.endDateTime).toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + provider_token
      },
      body: JSON.stringify(googleEvent)
    });
    return response;
  },
}