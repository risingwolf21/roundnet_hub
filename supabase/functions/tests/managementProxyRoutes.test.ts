import { assert, assertEquals, assertFalse } from '@std/assert';
import { buildAllowedRoutes, isAllowedRoute, projectRefFromUrl } from '../_shared/managementProxyRoutes.ts';

const REF = 'abcdefghijklmnop';
const routes = buildAllowedRoutes(REF);

Deno.test('allows reading the logs endpoint (with and without query string)', () => {
  assert(isAllowedRoute(routes, 'GET', `/v1/projects/${REF}/analytics/endpoints/logs.all`));
  assert(isAllowedRoute(routes, 'GET', `/v1/projects/${REF}/analytics/endpoints/logs.all?sql=select%201&iso_timestamp_start=x`));
  assert(isAllowedRoute(routes, 'get', `/v1/projects/${REF}/analytics/endpoints/logs.all`), 'method is case-insensitive');
});

Deno.test('allows POST database/query', () => {
  assert(isAllowedRoute(routes, 'POST', `/v1/projects/${REF}/database/query`));
});

Deno.test('rejects allowed paths with the wrong method', () => {
  assertFalse(isAllowedRoute(routes, 'POST', `/v1/projects/${REF}/analytics/endpoints/logs.all`));
  assertFalse(isAllowedRoute(routes, 'GET', `/v1/projects/${REF}/database/query`));
  assertFalse(isAllowedRoute(routes, 'DELETE', `/v1/projects/${REF}/database/query`));
});

Deno.test('rejects other projects', () => {
  assertFalse(isAllowedRoute(routes, 'POST', '/v1/projects/otherproject/database/query'));
  assertFalse(isAllowedRoute(routes, 'POST', `/v1/projects/${REF}x/database/query`));
});

Deno.test('rejects every other Management API endpoint', () => {
  for (const [method, path] of [
    ['GET', `/v1/projects/${REF}/secrets`],
    ['POST', `/v1/projects/${REF}/secrets`],
    ['GET', `/v1/projects/${REF}/api-keys`],
    ['DELETE', `/v1/projects/${REF}`],
    ['PATCH', `/v1/projects/${REF}/config/auth`],
    ['GET', '/v1/projects'],
    ['GET', '/v1/organizations'],
  ]) {
    assertFalse(isAllowedRoute(routes, method, path), `${method} ${path}`);
  }
});

Deno.test('rejects path tricks', () => {
  assertFalse(isAllowedRoute(routes, 'POST', `/v1/projects/${REF}/database/query/../../secrets`));
  assertFalse(isAllowedRoute(routes, 'POST', `/v1/projects/${REF}/database/query?x=1`));
  assertFalse(isAllowedRoute(routes, 'GET', `/v1/projects/${REF}/analytics/endpoints/logsXall`), 'dot is literal');
  assertFalse(isAllowedRoute(routes, 'POST', `//evil.example/v1/projects/${REF}/database/query`));
  assertFalse(isAllowedRoute(routes, 'POST', `https://evil.example/v1/projects/${REF}/database/query`));
});

Deno.test('project ref is regex-escaped', () => {
  const dotted = buildAllowedRoutes('a.b');
  assert(isAllowedRoute(dotted, 'POST', '/v1/projects/a.b/database/query'));
  assertFalse(isAllowedRoute(dotted, 'POST', '/v1/projects/aXb/database/query'));
});

Deno.test('derives project ref from the Supabase URL', () => {
  assertEquals(projectRefFromUrl('https://abcdefghijklmnop.supabase.co'), 'abcdefghijklmnop');
});
