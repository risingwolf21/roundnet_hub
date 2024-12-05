// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { addDays, addMonths, format, isAfter } from 'https://esm.sh/date-fns';
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

type EventRecurrence = 'Weekly' | 'Fortnightly' | 'Monthly' | 'None';
type Event = {
  answerDeadline?: string | null;
  created_at: string;
  description: string;
  recurrenceEnd?: string | null;
  endDateTime?: string | null;
  group: number | null;
  id: number;
  isCancelled: boolean;
  key: string;
  maxAttendees: number;
  meetingDateTime?: string | null;
  place?: string | null;
  recurrence: EventRecurrence;
  startingDateTime: string;
  title: string;
};

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

Deno.serve(async (req: Request) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: current_events, error: current_events_error } = await supabaseClient
      .from('current_distinct_event')
      .select('*')
      .select<Event[]>();

    const { data, error } = await supabaseClient.from('distinct_event').select('*').select<Event[]>();

    if (error) throw error;
    if (current_events_error) throw current_events_error;

    const eventsToCreate = current_events.filter(
      (event: Event) =>
        !data.some((x: Event) => x.key === event.key && isAfter(x.startingDateTime, event.startingDateTime))
    );

    console.log('Found events to create the next recurrence: \n', eventsToCreate);

    const addRecurringFrequency = (date: Date, frequency: EventRecurrence) => {
      if (frequency === 'Weekly') {
        return addDays(date, 7);
      } else if (frequency === 'Fortnightly') {
        return addDays(date, 14);
      } else if (frequency === 'Monthly') {
        return addMonths(date, 1);
      }
      return null;
    };

    const createNextEvent = async (event: Event) => {
      let newStartingDateTime = addRecurringFrequency(new Date(event.startingDateTime), event.recurrence);
      if (newStartingDateTime === null) {
        console.log('Event has no starting time!', event);
        return;
      }

      let newEvent = {
        title: event.title,
        recurrence: event.recurrence,
        description: event.description,
        startingDateTime: format(newStartingDateTime, 'yyyy-MM-dd HH:mm:ssXXX'),
        place: event.place,
        recurrenceEnd: event.recurrenceEnd,
        endDateTime: event.endDateTime,
        key: event.key,
        group: event.group,
        maxAttendees: event.maxAttendees,
        answerDeadline: event.answerDeadline,
      } as Event;

      if (event.meetingDateTime) {
        let newMeetingDateTime = addRecurringFrequency(new Date(event.meetingDateTime), event.recurrence);
        if (newMeetingDateTime !== null)
          newEvent.meetingDateTime = format(newMeetingDateTime, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }
      if (event.endDateTime) {
        let newEndDateTime = addRecurringFrequency(new Date(event.endDateTime), event.recurrence);
        if (newEndDateTime !== null) newEvent.endDateTime = format(newEndDateTime, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }
      if (event.answerDeadline) {
        let newAnswerDeadline = addRecurringFrequency(new Date(event.answerDeadline), event.recurrence);
        if (newAnswerDeadline !== null)
          newEvent.answerDeadline = format(newAnswerDeadline, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }

      let maximumStartTime = addMonths(new Date(event.startingDateTime), 1);

      if (
        (!event.recurrenceEnd || newStartingDateTime < new Date(event.recurrenceEnd)) &&
        newStartingDateTime <= maximumStartTime
      ) {
        const { data, error } = await supabaseClient.from('events').insert(newEvent).select('*').single();
        if (error || data.length < 1) {
          console.error('Could not create event with error', error, event);
          Sentry.captureException(Error(JSON.stringify({ error, data })));
        } else {
          console.info('Inserted new event \n', data);
        }
      } else {
        let exceededRecurrenceEnd = !event.recurrenceEnd || newStartingDateTime < new Date(event.recurrenceEnd);
        let exceededMaxiumumStartTime = newStartingDateTime <= maximumStartTime;
        console.warn(
          'Event was not added to Database.',
          event,
          exceededMaxiumumStartTime ?? `Maximum Starttime for the event of ${maximumStartTime} was exceeded`,
          exceededRecurrenceEnd ?? `Maxiumum recurrence end for event was exceeded: ${newStartingDateTime}`
        );
        Sentry.captureException(
          Error(
            JSON.stringify({
              eventToAdd: newEvent,
              recurrenceEnd: event.recurrenceEnd,
              newStartingDateTime: newStartingDateTime,
              maximumStartTime: maximumStartTime,
            })
          )
        );
      }
    };

    for (const event of eventsToCreate) {
      switch (event.recurrence) {
        case 'Fortnightly':
        case 'Weekly':
        case 'Monthly': {
          console.log('Creating next event for: ', event.id, event.key);
          await createNextEvent(event);
          break;
        }
        default:
        case 'None':
          console.log('No recurrence found for: ', event);
          break;
      }
    }

    // Return the response with the correct content type header
    return new Response({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer REMOVED_KEY' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
