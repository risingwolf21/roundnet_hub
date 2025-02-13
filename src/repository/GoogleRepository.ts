import { toDate } from "date-fns";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { Event } from "types/supabase";

export const GoogleRepository = {
  async insertEventToCalendar(event: Event, userId: string, provider_token: string, calendarSettings: CalendarSettings | null): Promise<Response | null> {
    const place = JSON.parse(event.place ?? "{}");

    const googleEvent = {
      'summary': event.title,
      'description': `${event.description}\n\n\nAdded by Roundnet Karlsruhe Web App❤️`,
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
    const jsonResponse = await response.json();
    if (jsonResponse.id) {
      await supabase.from("user_calendar_event_mapping").upsert({ user: userId, event: event.id, calendar_event_id: jsonResponse.id })
    }
    return response;
  },
  async deleteEventFromGoogleCalendar(event: Event, userId: string, provider_token: string, calendarSettings: CalendarSettings | null): Promise<Response | null> {
    if (!calendarSettings || !calendarSettings.calender_id)
      return null;

    const { data } = await supabase
      .from("user_calendar_event_mapping")
      .delete()
      .eq("user", userId)
      .eq("event", event.id)
      .select()
      .single();

    if (!data)
      return null;

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarSettings.calender_id}/events/${data.calendar_event_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + provider_token
      },
    });
    return response;
  }
}