import TextField from "@mui/material/TextField";
import { Duration } from "date-fns";
import { useEffect, useState } from "react";


/**
 * parseDuration("2w6d4h5m") -> {weeks:2, days:6, hours:4, minutes:5, seconds:0}
 * Erlaubt beliebige Reihenfolge und Wiederholungen, ignoriert Leerzeichen, case-insensitive.
 */
export function parseDuration(input: string): Duration {
  const result: Duration = {
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (!input) return result;

  const regex = /(\d+)\s*([wdhms])/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input))) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "w":
        result.weeks = (result.weeks ?? 0) + value;
        break;
      case "d":
        result.days = (result.days ?? 0) + value;
        break;
      case "h":
        result.hours = (result.hours ?? 0) + value;
        break;
      case "m":
        result.minutes = (result.minutes ?? 0) + value;
        break;
      case "s":
        result.seconds = (result.seconds ?? 0) + value;
        break;
      default:
        // nie erreicht, wegen Regex, aber der Vollständigkeit halber:
        break;
    }
  }
  return result;
}

const formatDuration = (d: Duration): string => {
  let parts: string[] = [];
  if (d.weeks && d.weeks > 0) parts.push(`${d.weeks}w`);
  if (d.days && d.days > 0) parts.push(`${d.days}d`);
  if (d.hours && d.hours > 0) parts.push(`${d.hours}h`);
  if (d.minutes && d.minutes > 0) parts.push(`${d.minutes}m`);
  if (d.seconds && d.seconds > 0) parts.push(`${d.seconds}s`);
  return parts.join(" ");
}

function validateDuration(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null; // leere Eingabe = 0 Dauer

  // nur erlaubte Zeichen?
  const allowed = /^[\d\swdhms]+$/i;
  if (!allowed.test(trimmed)) {
    return "Nur Ziffern, Leerzeichen und Einheiten w/d/h/m/s sind erlaubt.";
  }

  // alle Tokens müssen <zahl><einheit> sein, ggf. mit Leerraum dazwischen.
  const cleaned = trimmed.replace(/\s+/g, "");
  const tokenRe = /(\d+)([wdhms])/gi;

  let matchedConcat = "";
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(cleaned))) {
    matchedConcat += m[1] + m[2];
  }

  if (matchedConcat.length !== cleaned.length) {
    return 'Ungültiges Format. Jede Zahl braucht eine Einheit (w, d, h, m, s). Beispiel: "1h30m".';
  }

  return null;
}

type Props = {
  durationChanged: (d: Duration) => void;
  defaultDuration?: Duration;
}

export default function DurationAdder({ defaultDuration, durationChanged }: Props) {

  const [durationText, setDurationText] = useState<string>(defaultDuration ? formatDuration(defaultDuration) : "");
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const error = validateDuration(durationText);
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    const d = parseDuration(durationText);
    durationChanged(d);
  }, [durationText]);

  return <TextField
    fullWidth
    label={'Dauer'}
    placeholder="1h 30m"
    value={durationText}
    error={error !== null}
    helperText={error}
    onChange={(e) => setDurationText(e.target.value)} />

  // return (
  //   <div className="max-w-xl p-4 rounded-2xl shadow">
  //     <div className="grid gap-4">
  //       <label className="grid gap-2">
  //         <span className="text-sm font-medium">
  //           {labels?.start ?? "Start-Datum/-Zeit"}
  //         </span>
  //         <input
  //           type="datetime-local"
  //           className="border rounded-lg p-2"
  //           value={startLocal}
  //           onChange={(e) => setStartLocal(e.target.value)}
  //         />
  //       </label>

  //       <label className="grid gap-2">
  //         <span className="text-sm font-medium">
  //           {labels?.duration ?? 'Dauer (z. B. "2w6d4h5m")'}
  //         </span>
  //         <input
  //           type="text"
  //           className="border rounded-lg p-2"
  //           placeholder='z. B. "2w6d4h5m" oder "3d"'
  //           value={durationText}
  //           onChange={(e) => setDurationText(e.target.value)}
  //         />
  //         <p className="text-xs text-gray-500">
  //           Unterstützte Einheiten: w (Wochen), d (Tage), h (Stunden), m
  //           (Minuten), s (Sekunden). Reihenfolge beliebig, Wiederholungen
  //           erlaubt: z. B. "1h30m", "90m", "1d 2h".
  //         </p>
  //       </label>

  //       {error ? (
  //         <div className="text-red-600 text-sm">{error}</div>
  //       ) : (
  //         <div className="bg-gray-50 rounded-lg p-3">
  //           <div className="text-sm font-medium">
  //             {labels?.result ?? "Ende (berechnet):"}
  //           </div>
  //           <div className="mt-1 font-mono">
  //             {endDate ? formatLocal(endDate) : "—"}
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // );
}
