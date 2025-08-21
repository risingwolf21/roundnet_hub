// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  const name = typeof loc === "string" ? loc : loc.name;
  const lines: string[] = [];
  if (name) {
    lines.push(`LOCATION:${icsEscape(String(name))}`);
  }

  // GEO (RFC5545: "lat;lon")
  const lat = typeof loc?.lat === "number" ? loc.lat : null;
  const lon = typeof loc?.lon === "number" ? loc.lon : null;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    // keine Locale-Kommas – immer Punkt
    const latStr = String(lat);
    const lonStr = String(lon);
    lines.push(`GEO:${latStr};${lonStr}`);

    // Bonus: schöne Kartenintegration in Apple-Kalender
    // X-ADDRESS: lieber nur die Adresse ohne Namen, falls du sie trennen kannst.
    // Hier nehmen wir den Namen als Titel, und den Namen auch als Address-Fallback.
    const xTitle = icsEscape(String(name ?? "Ort"));
    const xAddr = icsEscape(String(name ?? ""));
    lines.push(
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=${xAddr};X-APPLE-RADIUS=49;X-TITLE=${xTitle}:geo:${latStr},${lonStr}`
    );
  }

  return lines;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return new Response("Missing userId", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service-Role, weil anonyme Kalender-Clients kein Login können
  );

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

    const locLines = icsLocationLines(e.location);

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
    --header 'Authorization: Bearer REMOVED_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
