import { Duration, format, intervalToDuration, parse } from 'date-fns';
import { t } from 'i18next';
import { TENANT } from '../tenant/config';

export const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const TENANT_LOGO = TENANT.logo;

export const BRANDING = {
  get logo() {
    return <img src={TENANT_LOGO} alt={t('common.logo')} style={{ height: 96, objectFit: 'contain' }} />;
  },
  title: import.meta.env.VITE_WEBSITE_NAME,
  icon: TENANT.icon,
};

export const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function groupBy<Type>(items: Type[], getter: (any: Type) => string): Map<string, Type[]> {
  const result = new Map<string, Type[]>();
  (items ?? []).forEach((item: Type) => {
    const key = getter(item);
    const entry = result.get(key);
    if (!entry) {
      return result.set(key, [item]);
    } else {
      result.set(key, [...entry, item]);
    }
    return null;
  });
  return result;
}

export const formatSafeDateToDatabase = (date: string | number | Date | null) => {
  if (!date) return null;
  return formatDateToDatabase(date);
};

export const formatDateToDatabase = (date: string | number | Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
};

export const formatSafeDateFromDatabase = (date: string | null) => {
  if (date === null) return null;
  return formatDateFromDatabase(date);
};

export const formatDateFromDatabase = (date: string | null) => {
  if (date === null) return null;
  const result = parse(date, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
  if (isNaN(result.getTime())) {
    return parse(date, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date());
  }
  return result;
};

export const formatDateFromDatabaseNotNull = (date: string) => {
  const result = parse(date, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
  if (isNaN(result.getTime())) {
    return parse(date, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date());
  }
  return result;
};

export const getDurationFrom = (start: string | null, end: string | null) => {
  const startDate = formatDateFromDatabase(start);
  const endDate = formatDateFromDatabase(end);
  if (startDate === null || endDate === null) {
    return null;
  }

  return getDuration(startDate, endDate);
};

export const getDuration = (start: Date, end: Date) => {
  return intervalToDuration({ start, end });
};

export const translationKeyOfItemType = (type: ItemType | null) => {
  switch (type) {
    case 'goethe':
      return 'itemType.goethe';
    case 'mtvGym':
      return 'itemType.mtvGym';
    case 'mtvGymPalazzo':
      return 'itemType.mtvGymPalazzo';
    case 'mtvStorage':
      return 'itemType.mtvStorage';
    default:
      return 'Not found';
  }
};

export const nameOfProductType = (type: ProductType) => {
  switch (type) {
    case 'Drink':
      return t('drinks.drinks');
    case 'Special':
      return t('drinks.productTypeSpecial');
    case 'None':
      return t('drinks.productTypeNone');
  }
};

export const nameOfRecurrence = (type: EventRecurrence) => {
  switch (type) {
    case 'Weekly':
      return t('events.creation.recurrenceWeekly');
    case 'Fortnightly':
      return t('events.creation.recurrenceFortnightly');
    case 'Monthly':
      return t('events.creation.recurrenceMonthly');
    case 'None':
      return t('events.creation.reminderNone');
  }
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = ((arr[0] ?? '').match(/:(.*?);/) ?? [])[1] ?? null;
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export function readFile(file: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
}

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

export function durationToPostgresInterval(d: Duration): string {
  const parts: string[] = [];
  const add = (n: number | undefined, singular: string, plural?: string) => {
    if (!n) return;
    const abs = Math.abs(n);
    parts.push(`${n} ${abs === 1 ? singular : (plural ?? singular + 's')}`);
  };

  add(d.years, 'year');
  add(d.months, 'month');
  add(d.weeks, 'week');
  add(d.days, 'day');
  add(d.hours, 'hour');
  add(d.minutes, 'minute');

  if (d.seconds && !Object.is(d.seconds, -0)) {
    const s = stripTrailingZeros(d.seconds);
    const unit = Math.abs(d.seconds) === 1 ? 'second' : 'seconds';
    parts.push(`${s} ${unit}`);
  }

  return parts.length ? parts.join(' ') : '0 seconds';
}

function stripTrailingZeros(n: number): string {
  const s = String(n);
  return s.includes('.') ? s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '') : s;
}

/** Postgres Interval (Standard) -> Duration */
export function postgresIntervalToDuration(interval: string): Duration {
  if (!interval?.trim()) return {};
  let s = interval.trim();

  const out: Required<Duration> = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  // 1) Zeitblock HH:MM:SS(.fff) mit optionalem Vorzeichen
  const t = s.match(/([+-])?(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (t) {
    const sign = t[1] === '-' ? -1 : 1;
    out.hours += sign * parseInt(t[2], 10);
    out.minutes += sign * parseInt(t[3], 10);
    out.seconds += sign * parseFloat(t[4]);
    s = (s.slice(0, t.index!) + s.slice(t.index! + t[0].length)).trim();
  }

  // 2) Wert+Einheit-Paare (years/mon(s)/months/day(s)/hour(s)/minute(s)/second(s)/week(s))
  const re =
    /([+-]?\d+(?:\.\d+)?)\s*(years?|year|mons?|months?|mon|month|weeks?|week|days?|day|hours?|hour|minutes?|minute|seconds?|second)\b/gi;
  for (const m of s.matchAll(re)) {
    const val = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    if (u.startsWith('year')) out.years += val;
    else if (u.startsWith('mon'))
      out.months += val; // "mon" oder "months"
    else if (u.startsWith('week')) out.weeks += val;
    else if (u.startsWith('day')) out.days += val;
    else if (u.startsWith('hour')) out.hours += val;
    else if (u.startsWith('min')) out.minutes += val;
    else out.seconds += val; // seconds
  }

  // 3) Optional: Tage in Wochen bündeln (7er-Schritte)
  if (Math.abs(out.days) >= 7 && Number.isInteger(out.days)) {
    const w = (out.days / 7) | 0; // trunc toward zero
    out.weeks += w;
    out.days -= w * 7;
  }

  // 4) Leere Felder auslassen
  const d: Duration = {};
  if (out.years) d.years = out.years;
  if (out.months) d.months = out.months;
  if (out.weeks) d.weeks = out.weeks;
  if (out.days) d.days = out.days;
  if (out.hours) d.hours = out.hours;
  if (out.minutes) d.minutes = out.minutes;
  if (out.seconds) d.seconds = out.seconds;

  return d;
}

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};