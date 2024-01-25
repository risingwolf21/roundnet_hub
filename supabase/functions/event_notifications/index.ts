import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import * as OneSignal from 'https://esm.sh/@onesignal/node-onesignal@1.0.0-beta7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as Sentry from 'https://deno.land/x/sentry/index.mjs'

const _OnesignalAppId_ = Deno.env.get('ONESIGNAL_APP_ID')!
const _OnesignalUserAuthKey_ = Deno.env.get('USER_AUTH_KEY')!
const _OnesignalRestApiKey_ = Deno.env.get('ONESIGNAL_REST_API_KEY')!
const configuration = OneSignal.createConfiguration({
  userKey: _OnesignalUserAuthKey_,
  appKey: _OnesignalRestApiKey_,
})

Sentry.init({
  dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
})

type EdgeFunctions = "eventComments" | "userRegistration" | "paymentRequest" | "paymentPending";


export class PayloadError extends Error {

  private payload: any

  constructor(message: string, payload: any) {
    super(message);
    this.payload = payload;
  }

}

const onesignal = new OneSignal.DefaultApi(configuration)

serve(async (req) => {
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
        }
      },
    );

    const json = await req.json()

    if (!json || !json.contents || !json.notificationTag)
      throw new PayloadError("The Request did not math the needed criteria", json);

    async function getUsersForNotificationTag(tag: EdgeFunctions, json: any): Promise<string[]> {
      if (tag === "eventComments") {
        const eventId = json.eventId;
        console.log("Fetching users with event comments for event", eventId)
        const { data, error } = await supabaseClient.rpc("getusersforeventcommentnotifications", { "event_id": eventId });
        console.log("Users for eventComments", data, error);
        return data;
      } else if (tag === "paymentRequest") {
        const { data, error } = await supabaseClient.rpc("getusersforpaymentrequestnotifications");
        console.log("Users for paymentRequest", data, error);
        return data;
      }
      return [];
    }

    const sendNotification = async (include_aliases: string[]) => {
      console.log("Sending notifications to ", include_aliases)
      const notification = new OneSignal.Notification()
      notification.app_id = _OnesignalAppId_
      notification.target_channel = "push"
      notification.include_external_user_ids = include_aliases
      notification.contents = json.contents
      var response = await onesignal.createNotification(notification)
      return response;
    }

    var users = await getUsersForNotificationTag(json.notificationTag as EdgeFunctions, json)

    var onesignalApiRes = await sendNotification(users)

    console.log(onesignalApiRes)

    return new Response(JSON.stringify({ onesignalResponse: onesignalApiRes }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Failed to create OneSignal notification', err)
    return new Response('Server error.', {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})