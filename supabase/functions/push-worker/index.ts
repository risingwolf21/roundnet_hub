import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import webpush from "web-push";
import { Database } from '../_shared/supabase-generated.types.ts';

type NotificationOutbox = Database['notifications']['Tables']['notification_outbox']['Row'];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

Sentry.setTag('region', Deno.env.get('SB_REGION'))
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'))

type TargetRow = {
  outbox_id: number;
  subscription_id: string;
  status: "pending" | "sent" | "failed" | "skipped";
  attempt_count: number;
  last_status: number | null;
  last_error: string | null;
  next_attempt_at: string;
  web_push_subscriptions?: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    revoked_at: string | null;
  } | null;
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const BATCH = parseInt(Deno.env.get("PUSH_WORKER_BATCH") ?? "100", 10);
const MAX_JOB_ATTEMPTS = parseInt(Deno.env.get("PUSH_WORKER_MAX_JOB_ATTEMPTS") ?? "8", 10);
const MAX_TARGET_ATTEMPTS = parseInt(Deno.env.get("PUSH_WORKER_MAX_TARGET_ATTEMPTS") ?? "5", 10);
const BACKOFF_CAP_SECONDS = parseInt(Deno.env.get("PUSH_WORKER_BACKOFF_CAP_SECONDS") ?? "1800", 10); // 30 min

// Wrap VAPID setup with error handling to catch configuration issues early
try {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables are not set");
  }
  webpush.setVapidDetails("mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e: any) {
  Sentry.captureException(e, {
    extra: {
      message: "Failed to set VAPID details",
      vapidPublicKey: VAPID_PUBLIC_KEY ? "present" : "missing",
      vapidPrivateKey: VAPID_PRIVATE_KEY ? "present" : "missing",
    },
    tags: {
      errorType: "vapid_setup_failure",
    },
  });
  throw e; // Re-throw to prevent the worker from starting with invalid config
}

function nowIso() {
  return new Date().toISOString();
}

function calcBackoffSeconds(attempts: number) {
  // capped exponential (1,2,4,8,... seconds), min 5s
  const base = Math.max(5, 2 ** attempts);
  return Math.min(BACKOFF_CAP_SECONDS, base);
}

function validateSubscription(sub: TargetRow['web_push_subscriptions']): { valid: boolean; reason?: string } {
  if (!sub) {
    return { valid: false, reason: "subscription is null" };
  }
  if (!sub.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.trim().length === 0) {
    return { valid: false, reason: "invalid or missing endpoint" };
  }
  if (!sub.p256dh || typeof sub.p256dh !== 'string' || sub.p256dh.trim().length === 0) {
    return { valid: false, reason: "invalid or missing p256dh key" };
  }
  if (!sub.auth || typeof sub.auth !== 'string' || sub.auth.trim().length === 0) {
    return { valid: false, reason: "invalid or missing auth key" };
  }
  // Basic URL validation for endpoint
  try {
    new URL(sub.endpoint);
  } catch {
    return { valid: false, reason: "endpoint is not a valid URL" };
  }
  return { valid: true };
}

async function fetchDueJobs(limit: number): Promise<NotificationOutbox[]> {
  const { data, error } = await supabase
    .schema("notifications")
    .from("notification_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

async function claimJob(jobId: number): Promise<boolean> {
  // Optimistic locking: only claim if still 'pending'
  const { data, error } = await supabase
    .schema("notifications")
    .from("notification_outbox")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function fetchPendingTargets(jobId: number): Promise<TargetRow[]> {
  // Join auf Subscriptions; filter revoked in code (PostgREST-Join-Filter ist mühsam)
  const { data, error } = await supabase
    .schema("notifications")
    .from("notification_outbox_targets")
    .select(
      `
      outbox_id,
      subscription_id,
      status,
      attempt_count,
      last_status,
      last_error,
      next_attempt_at,
      web_push_subscriptions (
        id, endpoint, p256dh, auth, revoked_at
      )
    `,
    )
    .eq("outbox_id", jobId)
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso());

  if (error) throw error;
  const rows = (data ?? []) as TargetRow[];
  return rows.filter((r) => !r.web_push_subscriptions?.revoked_at);
}

async function markTargetSent(jobId: number, subId: string, statusCode: number) {
  const { error } = await supabase
    .schema("notifications")
    .from("notification_outbox_targets")
    .update({
      status: "sent"
    })
    .eq("outbox_id", jobId)
    .eq("subscription_id", subId);

  if (error) throw error;
  await supabase.schema("notifications").rpc("inc_target_attempt", { p_outbox_id: jobId, p_subscription_id: subId, p_status: statusCode });
}

async function markTargetSkipped(jobId: number, subId: string, statusCode: number, message: string) {
  const { error } = await supabase
    .schema("notifications")
    .from("notification_outbox_targets")
    .update({
      status: "skipped",
    })
    .eq("outbox_id", jobId)
    .eq("subscription_id", subId);
  if (error) throw error;
  await supabase.schema("notifications").rpc("inc_target_attempt", { p_outbox_id: jobId, p_subscription_id: subId, p_status: statusCode, p_error: message });
}

async function backoffTarget(jobId: number, subId: string, attemptsNext: number, statusCode: number | null, message: string) {
  const delaySec = calcBackoffSeconds(attemptsNext);
  const next = new Date(Date.now() + delaySec * 1000).toISOString();

  const { error } = await supabase
    .schema("notifications")
    .from("notification_outbox_targets")
    .update({
      attempt_count: attemptsNext,
      next_attempt_at: next,
      last_status: statusCode,
      last_error: message,
    })
    .eq("outbox_id", jobId)
    .eq("subscription_id", subId);

  if (error) throw error;
}

async function revokeSubscription(subId: string) {
  const { error } = await supabase
    .schema("notifications")
    .from("web_push_subscriptions")
    .update({ revoked_at: nowIso() })
    .eq("id", subId);
  if (error) throw error;
}

async function finishJob(jobId: number, ok: boolean, attemptsNext: number) {
  if (ok) {
    const { error } = await supabase
      .schema("notifications")
      .from("notification_outbox")
      .update({ status: "sent", sent_at: nowIso() })
      .eq("id", jobId);
    if (error) throw error;
  } else {
    if (attemptsNext >= MAX_JOB_ATTEMPTS) {
      const { error } = await supabase
        .schema("notifications")
        .from("notification_outbox")
        .update({ status: "dead", attempt_count: attemptsNext, last_error: "max attempts reached" })
        .eq("id", jobId);
      if (error) throw error;
    } else {
      const delaySec = calcBackoffSeconds(attemptsNext);
      const next = new Date(Date.now() + delaySec * 1000).toISOString();
      const { error } = await supabase
        .schema("notifications")
        .from("notification_outbox")
        .update({ status: "pending", attempt_count: attemptsNext, next_attempt_at: next })
        .eq("id", jobId);
      if (error) throw error;
    }
  }
}

async function processJob(job: NotificationOutbox) {
  // fetch targets
  const targets = await fetchPendingTargets(job.id);
  if (targets.length === 0) {
    // keine Ziele mehr → sent
    await finishJob(job.id, true, job.attempt_count);
    return { jobId: job.id, sent: true, targets: 0 };
  }

  let allSent = true;
  const results: any[] = [];

  // Process targets concurrently but modestly
  const CONCURRENCY = 10;
  const chunks: TargetRow[][] = [];
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    chunks.push(targets.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (t) => {
        const sub = t.web_push_subscriptions!;
        
        // Validate subscription data before attempting to send
        const validation = validateSubscription(sub);
        if (!validation.valid) {
          allSent = false;
          const msg = `Invalid subscription: ${validation.reason}`;
          Sentry.captureMessage(msg, {
            level: 'warning',
            extra: {
              jobId: job.id,
              subId: sub?.id,
              reason: validation.reason,
            },
            tags: {
              pushErrorType: 'invalid_subscription',
            },
          });
          await revokeSubscription(sub.id);
          await markTargetSkipped(job.id, sub.id, 0, msg);
          results.push({ subId: sub.id, ok: false, status: 0, action: "revoke+skip", reason: validation.reason });
          return;
        }

        const payloadObj = { title: job.title, body: job.body, data: job.data ?? {} }
        const payload = JSON.stringify(payloadObj);
        try {
          const opts: any = {
            TTL: job.ttl_seconds ?? undefined,
            urgency: job.urgency,
          };
          const res = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            } as any,
            payload,
            opts,
          );

          // res has statusCode; web-push resolves on 201/204 typically
          await markTargetSent(job.id, sub.id, (res as any)?.statusCode ?? 201);
          results.push({ subId: sub.id, ok: true, status: (res as any)?.statusCode ?? 201 });
        } catch (e: any) {
          // Extract status code from various possible locations in the error object
          // web-push library may store it in different places depending on the error type
          const status = e?.statusCode ?? e?.response?.statusCode ?? e?.body?.statusCode ?? 0;

          allSent = false;
          const msg = e?.message ?? "send error";

          // Categorize errors and handle appropriately:
          // 400-403: Invalid VAPID/auth, malformed request → permanent failure, revoke subscription
          // 404/410: Endpoint gone/expired → revoke subscription (expected; no Sentry noise)
          // 429: Rate limit → retry with backoff
          // 500-599: Server error → retry with backoff
          // Other: Unknown error → retry with backoff and report to Sentry

          if (status === 400 || status === 401 || status === 403) {
            // Permanent authentication/authorization failures - revoke subscription
            await revokeSubscription(sub.id);
            await markTargetSkipped(job.id, sub.id, status, msg);
            results.push({ subId: sub.id, ok: false, status, action: "revoke+skip", reason: "auth_failure" });
          } else if (status === 404 || status === 410) {
            // Endpoint gone or subscription expired — expected outcome, revoke and move on
            await revokeSubscription(sub.id);
            await markTargetSkipped(job.id, sub.id, status, msg);
            results.push({ subId: sub.id, ok: false, status, action: "revoke+skip", reason: "endpoint_gone" });
          } else if (status === 429) {
            // Rate limit - use longer backoff
            const attemptsNext = Math.min(t.attempt_count + 1, MAX_TARGET_ATTEMPTS);
            await backoffTarget(job.id, sub.id, attemptsNext, status, msg);
            results.push({ subId: sub.id, ok: false, status, action: "backoff", attemptsNext, reason: "rate_limit" });
          } else if (status >= 500 && status < 600) {
            // Server error - retry with backoff
            const attemptsNext = Math.min(t.attempt_count + 1, MAX_TARGET_ATTEMPTS);
            await backoffTarget(job.id, sub.id, attemptsNext, status, msg);
            results.push({ subId: sub.id, ok: false, status, action: "backoff", attemptsNext, reason: "server_error" });
          } else {
            // Truly unexpected: capture to Sentry for investigation
            Sentry.captureException(e, {
              extra: {
                message: msg,
                statusCode: status,
                errorName: e?.name,
                errorStack: e?.stack,
                endpoint: sub.endpoint,
                jobId: job.id,
                subId: sub.id,
                rawErrorBody: e?.body,
                rawErrorHeaders: e?.headers,
                fullError: JSON.stringify(e, Object.getOwnPropertyNames(e)),
              },
              tags: {
                pushErrorType: e?.name || 'unknown',
                statusCode: String(status),
                errorCategory: 'unknown',
              },
            });
            const attemptsNext = Math.min(t.attempt_count + 1, MAX_TARGET_ATTEMPTS);
            await backoffTarget(job.id, sub.id, attemptsNext, status, msg);
            results.push({ subId: sub.id, ok: false, status, action: "backoff", attemptsNext, reason: "unknown_error" });
          }
        }
      }),
    );
  }

  // job-level attempt/backoff wenn nicht alle Targets gesendet
  const attemptsNext = job.attempt_count + (allSent ? 0 : 1);
  await finishJob(job.id, allSent, attemptsNext);
  return { jobId: job.id, sent: allSent, targets: targets.length, results };
}

async function handleRun(): Promise<Response> {
  const start = Date.now();
  const due = await fetchDueJobs(BATCH);

  const summary: any = { scanned: due.length, claimed: 0, ok: 0, fail: 0, jobs: [] as any[] };

  for (const job of due) {
    const claimed = await claimJob(job.id);
    if (!claimed) continue;
    summary.claimed++;
    try {
      const r = await processJob(job);
      summary.ok += r.sent ? 1 : 0;
      summary.fail += r.sent ? 0 : 1;
      summary.jobs.push(r);
    } catch (e: any) {
      summary.fail++;
      summary.jobs.push({ jobId: job.id, error: e?.message ?? String(e) });
      // job auf pending/backoff setzen:
      const attemptsNext = job.attempt_count + 1;
      await finishJob(job.id, false, attemptsNext);
    }
  }

  summary.ms = Date.now() - start;
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

Deno.serve(async (req) => {
  try {
    // einfache health-check route
    const url = new URL(req.url);
    if (url.pathname.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
        headers: { "content-type": "application/json" },
      });
    }

    // nur POST/GET zulassen
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response("method not allowed", { status: 405 });
    }

    return await handleRun();
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500 });
  }
});
