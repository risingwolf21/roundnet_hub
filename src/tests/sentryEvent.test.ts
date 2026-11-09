import * as Sentry from '@sentry/react';
import type { ErrorEvent, EventHint } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { PostgrestError } from '@supabase/postgrest-js';
import { describePlainError } from '@/lib/sentryEvent';

// What Sentry builds for captureException(<plain object>): the values of the object are dropped.
const eventFor = (): ErrorEvent =>
  ({
    type: undefined,
    exception: {
      values: [
        {
          type: 'Error',
          value: 'Object captured as exception with keys: code, details, hint, message',
          mechanism: { type: 'generic', handled: true, synthetic: true },
        },
      ],
    },
  }) as ErrorEvent;

const hintFor = (originalException: unknown): EventHint => ({ originalException });

describe('describePlainError', () => {
  it('shows the message and code of a PostgREST error instead of "Object captured as exception"', () => {
    const postgrestError = {
      code: '42501',
      details: null,
      hint: null,
      message: 'permission denied for view user_grants_view',
    };

    const event = describePlainError(eventFor(), hintFor(postgrestError));

    expect(event.exception?.values?.[0]).toMatchObject({
      type: 'PostgrestError',
      value: 'permission denied for view user_grants_view (42501)',
    });
    expect(event.extra?.error).toEqual(postgrestError); // code, details and hint stay available
    expect(event.tags).toMatchObject({ error_code: '42501' });
  });

  it('keeps the hint and details of the error', () => {
    const error = { code: '23505', details: 'Key (id)=(1) already exists.', hint: 'Use another id', message: 'duplicate key value' };
    expect(describePlainError(eventFor(), hintFor(error)).extra?.error).toMatchObject({ details: error.details, hint: error.hint });
  });

  it('works for an object without a code (e.g. an Edge Function body used as error)', () => {
    const event = describePlainError(eventFor(), hintFor({ message: 'Interner Serverfehler' }));

    expect(event.exception?.values?.[0]).toMatchObject({ type: 'Error', value: 'Interner Serverfehler' });
    expect(event.tags?.error_code).toBeUndefined();
  });

  it('leaves real Error instances alone (they already carry a message and a stack)', () => {
    const event = eventFor();
    const before = JSON.stringify(event);

    describePlainError(event, hintFor(new Error('boom')));

    expect(JSON.stringify(event)).toBe(before);
  });

  it('leaves objects without a usable message, strings and missing exceptions alone', () => {
    for (const original of [{ foo: 1 }, { message: '' }, { message: 42 }, 'just a string', undefined, null]) {
      const event = eventFor();
      const before = JSON.stringify(event);
      describePlainError(event, hintFor(original));
      expect(JSON.stringify(event)).toBe(before);
    }
    const noException = { message: 'a log message' } as ErrorEvent;
    expect(describePlainError(noException, hintFor({ message: 'x', code: '1' }))).toEqual({ message: 'a log message' });
  });
});

// Initialises the real SDK with a transport that collects the events instead of sending them.
const captureWithRealSdk = async (integrations: ReturnType<typeof Sentry.extraErrorDataIntegration>[], error: unknown) => {
  const sent: ErrorEvent[] = [];
  Sentry.init({
    dsn: 'https://public@example.ingest.sentry.io/1',
    defaultIntegrations: false,
    integrations,
    beforeSend: (event, hint) => describePlainError(event, hint),
    transport: () => ({
      send: async (envelope) => {
        envelope[1].forEach(([, payload]) => (payload as ErrorEvent).exception && sent.push(payload as ErrorEvent));
        return {};
      },
      flush: async () => true,
    }),
  });
  Sentry.captureException(error);
  await Sentry.flush(2000);
  return sent;
};

describe('with the real Sentry SDK', () => {
  it('sends the PostgREST error from a failed query as a readable exception', async () => {
    // The failure of GET /rest/v1/user_grants_view, thrown by `if (error) throw error` and captured by React Query.
    const sent = await captureWithRealSdk([], { code: '42501', details: null, hint: null, message: 'permission denied for view user_grants_view' });

    expect(sent).toHaveLength(1);
    expect(sent[0].exception?.values?.[0]).toMatchObject({ type: 'PostgrestError', value: 'permission denied for view user_grants_view (42501)' });
    expect(sent[0].extra?.error).toMatchObject({ code: '42501', message: 'permission denied for view user_grants_view' });
    expect(sent[0].tags).toMatchObject({ error_code: '42501' });
  });

  // `.throwOnError()` throws a real PostgrestError (an Error subclass), but Sentry drops its code/details/hint by default.
  const thrown = () => new PostgrestError({ code: '23505', details: 'Key (id)=(1) already exists.', hint: 'Use another id', message: 'duplicate key value' });

  it('keeps code, details and hint of a thrown PostgrestError with extraErrorDataIntegration', async () => {
    const [event] = await captureWithRealSdk([Sentry.extraErrorDataIntegration()], thrown());

    expect(event.exception?.values?.[0]).toMatchObject({ type: 'PostgrestError', value: 'duplicate key value' });
    expect(event.contexts?.PostgrestError).toMatchObject({ code: '23505', details: 'Key (id)=(1) already exists.', hint: 'Use another id' });
  });

  it('(without the integration those fields are lost)', async () => {
    const [event] = await captureWithRealSdk([], thrown());

    expect(event.contexts?.PostgrestError).toBeUndefined();
  });
});
