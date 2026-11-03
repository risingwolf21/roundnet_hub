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
