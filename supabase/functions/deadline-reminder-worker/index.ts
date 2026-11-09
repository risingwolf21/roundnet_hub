import * as Sentry from 'sentry';
import { createClient } from 'supabase';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN') ?? '',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

Sentry.setTag('region', Deno.env.get('SB_REGION'));
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'));

Deno.serve(async () => {
  try {
    const { data, error } = await supabase.rpc('send_answer_deadline_reminders');
    if (error) throw error;
    return new Response(JSON.stringify({ sent: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000);
    return new Response(String(error), { status: 500 });
  }
});
