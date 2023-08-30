// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req: Request) => {
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

		const { data, error } = await supabaseClient.from('distinct_event')
			.select();

		if (error) throw error

		data.forEach(async (event) => {
			switch (event.recurring) {
				case "FORTNIGHTLY":
				case "WEEKLY": {
					let daysToAdd = event.recurring === "WEEKLY" ? 7 : 14;
					let newStartingDateTime = new Date(event.startingDateTime);
					newStartingDateTime.setDate(newStartingDateTime.getDate() + daysToAdd);

					let newEvent = {
						title: event.title,
						recurring: event.recurring,
						description: event.description,
						startingDateTime: newStartingDateTime,
						location: event.location,
						"end_at": event["end_at"],
						key: event.key
					};

					if (event.meetingDateTime) {
						let newMeetingDateTime = new Date(event.meetingDateTime);
						newMeetingDateTime.setDate(newMeetingDateTime.getDate() + daysToAdd);
						newEvent.meetingDateTime = newMeetingDateTime;
					}

					let maximumStartTime = new Date(event.startingDateTime);
					maximumStartTime.setMonth(newStartingDateTime.getMonth() + 1);

					if ((!event["end_at"] || newStartingDateTime < new Date(event["end_at"])) && newStartingDateTime <= maximumStartTime) {
						console.log("Inserting new Event", event);
						await supabaseClient.from("events").insert(newEvent);
					} else {
						console.log(`New event was not added to database. Either newStartingDateTime(${newStartingDateTime}) exeeded end_at (${event["end_at"]}) or maximumStartTime (${maximumStartTime})`)
					}

					break;
				}
				case "MONTHLY": {

				}
				default:
				case "NONE":
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
		return new Response(JSON.stringify({ error: error.message }), { status: 500 })
	}
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer REMOVED_KEY' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
