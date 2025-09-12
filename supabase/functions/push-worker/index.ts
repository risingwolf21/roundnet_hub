// Deno Edge Function
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = parseInt(Deno.env.get("PUSH_BATCH_SIZE") ?? "100", 10);

function asString(u: unknown) { return typeof u === "string" ? u : ""; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}` } } }
  );

  // VAPID konfigurieren
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const workerId = `push-worker:${crypto.randomUUID().slice(0, 8)}`;

  const claim = async () => {
    const { data, error } = await supabase.rpc("claim_outbox_targets", {
      p_limit: BATCH_SIZE, p_lease_seconds: 55, p_worker: workerId
    });
    if (error) throw new Error("claim_outbox_targets: " + error.message);
    return (data as any[]) ?? [];
  };

  const markSent = async (id: number) => {
    const { error } = await supabase.rpc("complete_target_sent", { p_target_id: id });
    if (error) throw new Error("complete_target_sent: " + error.message);
  };

  const markFail = async (id: number, status: number, body: string) => {
    const { error } = await supabase.rpc("complete_target_failed", {
      p_target_id: id, p_status: status, p_error: body?.slice(0, 1000) ?? ""
    });
    if (error) throw new Error("complete_target_failed: " + error.message);
  };

  try {
    const claimed = await claim();
    if (claimed.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    let ok = 0, fail = 0;
    // Parallel mit Grenzen wäre möglich – hier sequenziell für Klarheit
    for (const row of claimed) {
      const targetId = row.target_id as number;
      const sub = {
        endpoint: asString(row.endpoint),
        keys: { p256dh: asString(row.p256dh), auth: asString(row.auth) }
      };
      const payload = JSON.stringify(row.payload ?? {});

      try {
        const res = await webpush.sendNotification(sub as any, payload, { TTL: 3600 });
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          await markSent(targetId);
          ok++;
        } else {
          const status = res.statusCode ?? 0;
          const body = typeof (res as any).body === "string" ? (res as any).body : String(res);
          await markFail(targetId, status, body);
          fail++;
        }
      } catch (err: any) {
        const status = err?.statusCode ?? 0;
        const body = typeof err?.body === "string" ? err.body : (err?.message ?? "unknown");
        await markFail(targetId, status, body);
        fail++;
      }
    }

    return new Response(JSON.stringify({ processed: claimed.length, ok, fail }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
