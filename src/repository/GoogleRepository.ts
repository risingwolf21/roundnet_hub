import { toDate } from "date-fns";
import { Event } from "types/supabase";

export const GoogleRepository = {
  async insertEventToCalendar(event: Event, provider_token: string, calendarSettings: CalendarSettings | null): Promise<Response | null> {
    const place = JSON.parse(event.place ?? "{}");

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
      },
      ...(calendarSettings?.minutes_to_remind && {
        'reminders': {
          'useDefault': false,
          'overrides': [
            { 'method': 'popup', 'minutes': calendarSettings?.minutes_to_remind },
          ],
        },
      }),
      ...(place.lat && place.lon && {
        'location': `${place.lat}, ${place.lon}`
      })
    }
    if (!calendarSettings || !calendarSettings.calender_id)
      return null;

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarSettings.calender_id}/events`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + provider_token
      },
      body: JSON.stringify(googleEvent)
    });
    return response;
  },
}