import { createClient } from 'npm:@supabase/supabase-js@2';
import { JWT } from 'npm:google-auth-library@9';
import serviceAccount from '../service-account.json' with { type: 'json' };
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

interface Notification {
  id: string;
  user: string;
  body: string;
  title: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: Notification;
  schema: 'public';
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: {
    headers: {
      app_version: '1.6.0',
    },
  },
});

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();

  const { data } = await supabase
    .from('user')
    .select('fcm_token')
    .not('fcm_token', 'is', null)
    .eq('userId', payload.record.user)
    .single();

  const fcmToken = data?.fcm_token;

  const accessToken = await getAccessToken({
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  });

  if (!fcmToken || !accessToken) {
    Sentry.captureException(Error('FCM Token or AccessToken was null'), (scope: any) => {
      scope.clear();
      scope.setExtra('accessToken', accessToken);
      scope.setExtra('fcmToken', fcmToken);
      scope.setExtra('payload', JSON.stringify(payload));
      return scope;
    });
    throw Error('FCM Token or AccessToken was null');
  }

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        data: {
          title: payload.record.title,
          body: payload.record.body,
          id: payload.record.id,
        },
      },
    }),
  });

  const resData = await res.json();
  if (res.status < 200 || 299 < res.status) {
    Sentry.captureException(Error(JSON.stringify({ resData })));
    throw resData;
  }

  return new Response(JSON.stringify(resData), {
    headers: { 'Content-Type': 'application/json' },
  });
});

const getAccessToken = ({ clientEmail, privateKey }: { clientEmail: string; privateKey: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens!.access_token!);
    });
  });
};
