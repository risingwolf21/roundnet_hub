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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      global: {
        headers: {
          app_version: '1.6.0',
        },
      },
    });

    const { data: current_events, error: current_events_error } = await supabaseClient
      .from('current_distinct_event')
      .select('*')
      .returns<Event[]>();

    const { data, error } = await supabaseClient.from('distinct_event').select('*').returns<Event[]>();

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
        console.error('Event has no starting time!', event);
        return;
      }
      if (!event.recurrence) {
        console.error('No need to create events without a recurrence');
        return;
      }
      if (isAfter(newStartingDateTime, addMonths(Date.now(), 2))) {
        const message = `Not creating event with startingDateTime [${newStartingDateTime}] because it is more than 2 month away [${addMonths(Date.now(), 2)}]`;
        console.error(message);
        Sentry.captureMessage('EVENT-CREATION: ' + message, {
          level: 'info',
          extra: {
            newStartingDateTime,
            two_months_ahead: addMonths(Date.now(), 2),
          },
        });
        return;
      }
      if (event.recurrenceEnd && isAfter(newStartingDateTime, event.recurrenceEnd)) {
        const message = `Not creating event with startingDateTime [${newStartingDateTime}] because it is after the recurrenceEnd [${event.recurrenceEnd}]`;
        console.error(message);
        Sentry.captureMessage('EVENT-CREATION: ' + message, {
          level: 'info',
          extra: {
            newStartingDateTime,
            recurrenceEnd: event.recurrenceEnd,
          },
        });
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
        newEvent.meetingDateTime = format(newMeetingDateTime, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }
      if (event.endDateTime) {
        let newEndDateTime = addRecurringFrequency(new Date(event.endDateTime), event.recurrence);
        newEvent.endDateTime = format(newEndDateTime, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }
      if (event.answerDeadline) {
        let newAnswerDeadline = addRecurringFrequency(new Date(event.answerDeadline), event.recurrence);
        newEvent.answerDeadline = format(newAnswerDeadline, 'yyyy-MM-dd HH:mm:ss.SSSXXX');
      }

      const { data, error } = await supabaseClient.from('events').insert(newEvent).select('*').single();
      if (error || data.length < 1) {
        console.error('Could not create event with error', error, event);
        Sentry.captureException(Error(JSON.stringify({ error, data })));
      } else {
        const { count } = await supabaseClient
          .from('event_attendance_user_mapping')
          .select('*', { count: 'exact', head: true })
          .eq('event', data.id);
        if (count > 0) {
          console.error('Inserted event with attendance already present! \n', count, data);
          Sentry.captureException(
            ReferenceError(
              JSON.stringify({
                event_attendance_count: count,
                created_event: data,
                original_event: event,
              })
            )
          );
        } else {
          console.info('Inserted new event \n', data);
          Sentry.captureMessage('Inserted new event', {
            level: 'info',
            extra: {
              eventId: data.id,
              eventKey: data.key,
              event: data,
            },
          });
        }
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
