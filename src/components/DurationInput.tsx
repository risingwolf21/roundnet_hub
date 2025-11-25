import TextField from '@mui/material/TextField';
import { Duration } from 'date-fns';
import { useEffect, useState } from 'react';

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
      case 'w':
        result.weeks = (result.weeks ?? 0) + value;
        break;
      case 'd':
        result.days = (result.days ?? 0) + value;
        break;
      case 'h':
        result.hours = (result.hours ?? 0) + value;
        break;
      case 'm':
        result.minutes = (result.minutes ?? 0) + value;
        break;
      case 's':
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
  const parts: string[] = [];
  if (d.weeks && d.weeks > 0) parts.push(`${d.weeks}w`);
  if (d.days && d.days > 0) parts.push(`${d.days}d`);
  if (d.hours && d.hours > 0) parts.push(`${d.hours}h`);
  if (d.minutes && d.minutes > 0) parts.push(`${d.minutes}m`);
  if (d.seconds && d.seconds > 0) parts.push(`${d.seconds}s`);
  return parts.join(' ');
};

function validateDuration(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null; // leere Eingabe = 0 Dauer

  // nur erlaubte Zeichen?
  const allowed = /^[\d\swdhms]+$/i;
  if (!allowed.test(trimmed)) {
    return 'Nur Zahlen, Leerzeichen und Einheiten w/d/h/m/s sind erlaubt.';
  }

  // alle Tokens müssen <zahl><einheit> sein, ggf. mit Leerraum dazwischen.
  const cleaned = trimmed.replace(/\s+/g, '');
  const tokenRe = /(\d+)([wdhms])/gi;

  let matchedConcat = '';
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(cleaned))) {
    matchedConcat += m[1] + m[2];
  }

  if (matchedConcat.length !== cleaned.length) {
    return 'Ungültiges Format. Jede Zahl braucht eine Einheit (h, m, s). Beispiel: "1h30m".';
  }

  return null;
}

type Props = {
  durationChanged: (d: Duration) => void;
  duration: Duration | null;
};

export default function DurationAdder({ duration, durationChanged }: Props) {
  const [durationText, setDurationText] = useState<string>(duration ? formatDuration(duration) : '');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <TextField
      fullWidth
      size="small"
      label={'Dauer'}
      placeholder="1h 30m"
      value={durationText}
      error={error !== null}
      helperText={error}
      onChange={(e) => setDurationText(e.target.value)}
    />
  );
}
