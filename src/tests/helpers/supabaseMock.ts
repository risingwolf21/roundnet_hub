/**
 * Shared Supabase client mock for unit tests.
 *
 * Usage:
 *   vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
 *   import { supabaseMock, op } from './helpers/supabaseMock';
 *
 * Every `from(table)` / `rpc(name, args)` call is recorded as a query including all chained
 * builder operations. Awaiting the builder resolves with `supabaseMock.respond(query)`; when
 * `.throwOnError()` was chained and the response has an `error`, the promise rejects instead.
 */

export type RecordedQuery = {
  schema?: string;
  table?: string;
  rpc?: string;
  args?: unknown;
  ops: Array<[string, unknown[]]>;
};

export type MockResponse = { data: unknown; error: unknown };

export type RecordedChannel = {
  name: string;
  on: Array<unknown[]>;
  subscribed: boolean;
};

const defaultRespond = (): MockResponse => ({ data: null, error: null });

export const supabaseMock = {
  queries: [] as RecordedQuery[],
  channels: [] as RecordedChannel[],
  removedChannels: [] as RecordedChannel[],
  authUserId: null as string | null,
  respond: defaultRespond as (query: RecordedQuery) => MockResponse | Promise<MockResponse>,
  reset() {
    this.queries = [];
    this.channels = [];
    this.removedChannels = [];
    this.authUserId = null;
    this.respond = defaultRespond;
  },
};

const createBuilder = (query: RecordedQuery): unknown => {
  const builder: unknown = new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(supabaseMock.respond(query))
              .then((response) => {
                const throws = query.ops.some(([o]) => o === 'throwOnError') && response.error;
                return throws ? Promise.reject(response.error) : response;
              })
              .then(resolve, reject);
        }
        if (typeof prop === 'symbol') return undefined;
        return (...args: unknown[]) => {
          query.ops.push([prop, args]);
          return builder;
        };
      },
    }
  );
  return builder;
};

const forSchema = (schema?: string) => ({
  from: (table: string) => {
    const query: RecordedQuery = { schema, table, ops: [] };
    supabaseMock.queries.push(query);
    return createBuilder(query);
  },
  rpc: (name: string, args?: unknown) => {
    const query: RecordedQuery = { schema, rpc: name, args, ops: [] };
    supabaseMock.queries.push(query);
    return createBuilder(query);
  },
});

const channel = (name: string) => {
  const recorded: RecordedChannel = { name, on: [], subscribed: false };
  supabaseMock.channels.push(recorded);
  const api = {
    __recorded: recorded,
    on: (...args: unknown[]) => {
      recorded.on.push(args);
      return api;
    },
    subscribe: () => {
      recorded.subscribed = true;
      return api;
    },
    unsubscribe: () => Promise.resolve('ok'),
  };
  return api;
};

export const supabaseClientMock = {
  ...forSchema(undefined),
  schema: (schema: string) => forSchema(schema),
  channel,
  removeChannel: (c: { __recorded?: RecordedChannel }) => {
    if (c?.__recorded) supabaseMock.removedChannels.push(c.__recorded);
    return Promise.resolve('ok');
  },
  auth: {
    getUser: () =>
      Promise.resolve({
        data: { user: supabaseMock.authUserId ? { id: supabaseMock.authUserId } : null },
        error: null,
      }),
    getSession: () =>
      Promise.resolve({
        data: { session: supabaseMock.authUserId ? { user: { id: supabaseMock.authUserId } } : null },
        error: null,
      }),
  },
};

export const supabaseModule = { supabase: supabaseClientMock };

/** Arguments of the first chained operation called `name`. */
export const op = (query: RecordedQuery | undefined, name: string) => query?.ops.find(([o]) => o === name)?.[1];

/** Arguments of every chained operation called `name`. */
export const opsNamed = (query: RecordedQuery | undefined, name: string) =>
  query?.ops.filter(([o]) => o === name).map(([, args]) => args) ?? [];

/** Names of all chained operations, in call order. */
export const opNames = (query: RecordedQuery | undefined) => query?.ops.map(([o]) => o) ?? [];
