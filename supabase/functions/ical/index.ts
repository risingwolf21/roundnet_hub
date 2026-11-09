import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import { Database } from '../_shared/supabase-generated.types.ts';

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

function icsEscape(text: string) {
  return (text ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function foldLines(s: string) {
  // iCal: maximal 75 octets pro Zeile; simpel: auf 74 Zeichen umbrechen mit CRLF + Space
  const lines = s.split("\r\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.length <= 74) { out.push(line); continue; }
    let rest = line;
    while (rest.length > 74) {
      out.push(rest.slice(0, 74));
      rest = " " + rest.slice(74);
    }
    out.push(rest);
  }
  return out.join("\r\n");
}

function formatDateUTC(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  // YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

// Wandelt dein JSON-Location-Objekt in ICS-Zeilen um
function icsLocationLines(loc: any): string[] {
  if (!loc) return [];

  // name
  const lines: string[] = [];

  // GEO (RFC5545: "lat;lon")
  if (loc?.lat && loc?.lon && loc?.name) {
    lines.push(`LOCATION:${loc.name}`);
    lines.push(`GEO:${loc.lat};${loc.lon}`);

    lines.push(
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=${loc.name};X-APPLE-RADIUS=49;X-TITLE=${loc.name}:geo:${loc.lat},${loc.lon}`
    );
  }

  return lines;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  const pathParts = url.pathname.split("/");

  const userId = pathParts[pathParts.length - 2];
  const fileName = pathParts[pathParts.length - 1];

  if (!userId || fileName !== "calendar.ics") {
    return new Response("Not Found. Use format: /ical/<userId>/calendar.ics", { status: 404 });
  }

  // Events laden (nur accepted). Optional: Zeitfenster begrenzen (z. B. -6 Monate bis +18 Monate)
  const { data: rows, error } = await supabase
    .from("event_attendance_user_mapping")
    .select(`
      state,
      user,
      events:events (
        id, title, startingDateTime, endDateTime, place, group: group(*), description
      )
    `)
    .eq("user", userId)
    .eq("state", "Attending");

  if (error) return new Response("DB error", { status: 500 });

  const now = new Date();
  const dtstamp = formatDateUTC(now);

  // ICS bauen (UTC-Variante; am stabilsten und ohne VTIMEZONE-Probleme)
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yourdomain//user-ical//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Roundnet Events",
    "X-WR-TIMEZONE:UTC"
  ].join("\r\n") + "\r\n";

  for (const r of rows ?? []) {
    const e = (r as any).events;
    if (!e) continue;

    const uid = `${e.id}@yourdomain`;
    const dtStart = formatDateUTC(e.startingDateTime);
    const dtEnd = formatDateUTC(e.endDateTime);

    const locLines = icsLocationLines(JSON.parse(e.place));

    ics += [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${icsEscape(e.title ?? "Event")}`,
      ...locLines,
      e.description ? `DESCRIPTION:${icsEscape(e.description)}` : null,
      `LAST-MODIFIED:${dtstamp}`,
      "END:VEVENT"
    ].filter(Boolean).join("\r\n") + "\r\n";
  }

  ics += "END:VCALENDAR\r\n";
  ics = foldLines(ics);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Clients (v. a. Google) cachen stark; 5–15 Min sind ok
      "Cache-Control": "public, max-age=600",
    }
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ical' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
