// An edge function stops right after its response, so events Sentry still holds in its queue are lost unless they are
// sent first. Wrap every handler: an error it throws is reported (and answered with 500), and the queue is always
// flushed before the response goes out. Each event is tagged with the Supabase project, i.e. the tenant.
// Sentry is passed in so this file needs no import of its own (each function maps `sentry` in its deno.json).
type SentryLike = {
  captureException: (error: unknown) => unknown;
  setTag: (key: string, value: string) => void;
  flush: (timeout?: number) => PromiseLike<boolean>;
};

const projectRef = new URL(Deno.env.get('SUPABASE_URL') ?? 'http://unknown').hostname.split('.')[0];

export const withSentry =
  (sentry: SentryLike, handler: (req: Request) => Promise<Response>) => async (req: Request) => {
    sentry.setTag('supabase_project', projectRef);
    try {
      return await handler(req);
    } catch (error) {
      sentry.captureException(error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      await sentry.flush(2000);
    }
  };
