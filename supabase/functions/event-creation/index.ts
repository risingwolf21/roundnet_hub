// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { format, addMonths, addDays } from "https://esm.sh/date-fns"
import * as Sentry from 'https://deno.land/x/sentry/index.mjs'

type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

type EventRecurrence = "Weekly" | "Fortnightly" | "Monthly" | "None"
type Event = {
	answerDeadline?: string | null
	created_at: string
	description: string
	end_at?: string | null
	group: number | null
	id: number
	isCancelled: boolean
	key: string
	maxAttendees: number
	meetingDateTime?: string | null
	place?: Json | null
	recurrence: EventRecurrence
	startingDateTime: string
	title: string
};

Sentry.init({
	dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
	integrations: [],
	// Performance Monitoring
	tracesSampleRate: 1.0,
	// Set sampling rate for profiling - this is relative to tracesSampleRate
	profilesSampleRate: 1.0,
})

Deno.serve(async (req: Request) => {
	try {

		const supabaseClient = createClient(
			// Supabase API URL - env var exported by default.
			Deno.env.get('SUPABASE_URL') ?? '',
			// Supabase API ANON KEY - env var exported by default.
			Deno.env.get('SUPABASE_ANON_KEY') ?? '',
			{
				global: {
					headers: {
						Authorization: req.headers.get('Authorization')!
					}
				},
				auth: {
					persistSession: false
				}
			},
		);

		const { data, error } = await supabaseClient.from('distinct_event').select("*")
			.select<Event[]>();

		console.log("Found events.", data)

		if (error) throw error;

		const addRecurringFrequency = (date: Date, frequency: EventRecurrence) => {
			if (frequency === "Weekly") {
				return addDays(date, 7);
			} else if (frequency === "Fortnightly") {
				return addDays(date, 14);
			} else if (frequency === "Monthly") {
				return addMonths(date, 1);
			}
			return null;
		}

		const createNextEvent = async (event: Event) => {
			let newStartingDateTime = addRecurringFrequency(new Date(event.startingDateTime), event.recurrence);
			if (newStartingDateTime === null) {
				console.log("Event has no starting time!", event);
				return;
			}

			let newEvent = {
				title: event.title,
				recurrence: event.recurrence,
				description: event.description,
				startingDateTime: format(newStartingDateTime, "yyyy-MM-dd HH:mm:ssXXX"),
				place: event.place,
				"end_at": event["end_at"],
				key: event.key,
				group: event.group,
				maxAttendees: event.maxAttendees,
				answerDeadline: event.answerDeadline
			} as Event;

			if (event.meetingDateTime) {
				let newMeetingDateTime = addRecurringFrequency(new Date(event.meetingDateTime), event.recurrence);
				if (newMeetingDateTime !== null)
					newEvent.meetingDateTime = format(newMeetingDateTime, "yyyy-MM-dd HH:mm:ss.SSSXXX");
			}
			if (event.answerDeadline) {
				let newAnswerDeadline = addRecurringFrequency(new Date(event.answerDeadline), event.recurrence);
				if (newAnswerDeadline !== null)
					newEvent.answerDeadline = format(newAnswerDeadline, "yyyy-MM-dd HH:mm:ss.SSSXXX");
			}

			let maximumStartTime = addMonths(new Date(event.startingDateTime), 1);

			if ((!event["end_at"] || newStartingDateTime < new Date(event["end_at"])) && newStartingDateTime <= maximumStartTime) {
				await supabaseClient.from("events").insert(newEvent).select("*");
			} else {
				console.log(`New event was not added to database. Either newStartingDateTime(${newStartingDateTime}) exeeded end_at (${event["end_at"]}) or maximumStartTime (${maximumStartTime})`)
			}
		}

		data.forEach(async (event: Event) => {
			switch (event.recurrence) {
				case "Fortnightly":
				case "Weekly":
				case "Monthly": {
					await createNextEvent(event);
					break;
				}
				default:
				case "None":
					break;
			}

		});

		// Return the response with the correct content type header
		return new Response({
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		})
	} catch (error) {
		Sentry.captureException(error)
		return new Response(JSON.stringify({ error: error.message }), { status: 500 })
	}
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer REMOVED_KEY' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
