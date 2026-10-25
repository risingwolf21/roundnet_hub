// recurrence-expander: expands each active event_series' RRULE into occurrence slots and hands
// them to public.apply_series_occurrences (which owns the DB merge). Invoked on demand from the
// app (user JWT) and on a schedule from pg_cron (service-role bearer via invoke_edge_function).
import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import { Database } from '../_shared/supabase-generated.types.ts';
import { expandSeries } from './expand.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  integrations: [Sentry.supabaseIntegration({ supabaseClient: supabase })],
});
Sentry.setTag('region', Deno.env.get('SB_REGION'));
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'));

Deno.serve(async (req: Request) => {
  try {
    // Authz: the cron path carries the service-role bearer; any other caller must hold event.edit.
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    if (bearer !== SUPABASE_SERVICE_ROLE_KEY) {
      const caller = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: allowed } = await caller.rpc('authorize', { requested_permission: 'event.edit' });
      if (!allowed) return new Response('forbidden', { status: 403 });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const seriesId: string | null = body.series_id ?? null;
    const horizonDays = Number.isFinite(body.horizon_days) ? Number(body.horizon_days) : 60;

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + horizonDays * 86_400_000);

    const { data: seriesList } = await supabase
      .rpc('series_for_expansion', { p_series_id: seriesId })
      .throwOnError();

    const results: unknown[] = [];
    for (const s of seriesList ?? []) {
      const slots = expandSeries(
        {
          rrule: s.rrule,
          dtstart: s.dtstart,
          timezone: s.timezone,
          until: s.until,
          durationMs: Math.round((s.duration_s ?? 0) * 1000),
          meetingOffsetMs: s.meeting_offset_s != null ? Math.round(s.meeting_offset_s * 1000) : null,
          answerOffsetMs: s.answer_offset_s != null ? Math.round(s.answer_offset_s * 1000) : null,
        },
        now,
        rangeEnd,
      );

      const { data: res } = await supabase
        .rpc('apply_series_occurrences', { p_series_id: s.id, p_slots: slots })
        .throwOnError();
      results.push({ series_id: s.id, ...(res as Record<string, unknown>) });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    Sentry.captureException(error);
    return new Response(JSON.stringify(String(error)), { status: 500 });
  }
});
