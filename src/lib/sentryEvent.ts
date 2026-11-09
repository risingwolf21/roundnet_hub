import type { ErrorEvent, EventHint } from '@sentry/react';

type PlainError = { message: string; code?: string };

const isPlainError = (value: unknown): value is PlainError =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Error) &&
  typeof (value as PlainError).message === 'string' &&
  (value as PlainError).message.length > 0;

// Supabase (PostgREST) returns its errors as plain objects: { code, details, hint, message }. Sentry reports those as
// "Object captured as exception with keys: ..." and drops every value. Show the message and code as the exception and
// keep the whole object (code, details, hint) as extra data, so the event says what failed and why.
export function describePlainError(event: ErrorEvent, hint: EventHint): ErrorEvent {
  const original = hint.originalException;
  const exception = event.exception?.values?.[0];
  if (!exception || !isPlainError(original)) return event;

  exception.type = original.code ? 'PostgrestError' : 'Error';
  exception.value = original.code ? `${original.message} (${original.code})` : original.message;
  event.extra = { ...event.extra, error: original };
  if (original.code) event.tags = { ...event.tags, error_code: original.code };
  return event;
}

/** Requests that never reached the server (offline, flaky mobile network): nothing to fix in the app. */
export const NETWORK_FAILURES = [/Load failed/, /Failed to fetch/, /NetworkError when attempting to fetch resource/];

// `ignoreErrors` runs before `beforeSend`, so it only sees "Object captured as exception" for a plain Supabase error.
// Describe the event first, then drop network failures by their real message.
export function prepareEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  describePlainError(event, hint);
  const value = event.exception?.values?.[0]?.value ?? '';
  return NETWORK_FAILURES.some((failure) => failure.test(value)) ? null : event;
}
