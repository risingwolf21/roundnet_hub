// Unit test for the APNs/FCM senders of the push-worker (no network, fetch is mocked).
import { assertEquals, assertRejects } from '@std/assert';
import { NativePushError, sendApns, sendFcm, signJwt } from '../push-worker/native.ts';

const toPem = (der: ArrayBuffer) => {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;
};

const ecKey = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const ecPem = toPem(await crypto.subtle.exportKey('pkcs8', ecKey.privateKey));
const rsaKey = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const rsaPem = toPem(await crypto.subtle.exportKey('pkcs8', rsaKey.privateKey));

const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));

Deno.test('signJwt creates a verifiable ES256 token', async () => {
  const jwt = await signJwt({ kid: 'KEY123' }, { iss: 'TEAM', iat: 1 }, ecPem, 'ES256');
  const [h, c, sig] = jwt.split('.');
  assertEquals(decode(h), { alg: 'ES256', typ: 'JWT', kid: 'KEY123' });
  assertEquals(decode(c), { iss: 'TEAM', iat: 1 });
  const raw = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, ecKey.publicKey, raw, new TextEncoder().encode(`${h}.${c}`));
  assertEquals(ok, true);
});

const withFetch = async (handler: (url: string, init: RequestInit) => Response, fn: () => Promise<void>) => {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string, init: RequestInit) => Promise.resolve(handler(String(url), init))) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
};

const payload = { title: 'Hi', body: 'There', data: { event: 'e1', n: 3 }, ttlSeconds: 60 };
const apns = { keyP8: ecPem, keyId: 'K', teamId: 'T', bundleId: 'de.roundnet.hub.karlsruhe', sandbox: false };

Deno.test('sendApns posts to the production host with topic and bearer token', async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  await withFetch((url, init) => {
    seen = { url, init };
    return new Response(null, { status: 200 });
  }, () => sendApns(apns, 'abc123', payload));
  assertEquals(seen!.url, 'https://api.push.apple.com/3/device/abc123');
  const headers = seen!.init.headers as Record<string, string>;
  assertEquals(headers['apns-topic'], 'de.roundnet.hub.karlsruhe');
  assertEquals(headers.authorization.startsWith('bearer '), true);
  assertEquals(JSON.parse(seen!.init.body as string).aps.alert, { title: 'Hi', body: 'There' });
});

Deno.test('sendApns maps dead tokens to 410 and config errors to 0', async () => {
  await withFetch(() => Response.json({ reason: 'BadDeviceToken' }, { status: 400 }), async () => {
    const e = await assertRejects(() => sendApns(apns, 't', payload), NativePushError);
    assertEquals(e.statusCode, 410);
  });
  await withFetch(() => Response.json({ reason: 'BadTopic' }, { status: 400 }), async () => {
    const e = await assertRejects(() => sendApns(apns, 't', payload), NativePushError);
    assertEquals(e.statusCode, 0);
  });
  await withFetch(() => Response.json({ reason: 'ServiceUnavailable' }, { status: 503 }), async () => {
    const e = await assertRejects(() => sendApns(apns, 't', payload), NativePushError);
    assertEquals(e.statusCode, 503);
  });
});

Deno.test('sendFcm authenticates, stringifies data and maps UNREGISTERED to 410', async () => {
  const fcm = { projectId: 'proj', clientEmail: 'sa@proj.iam.gserviceaccount.com', privateKey: rsaPem };
  const calls: string[] = [];
  let message: Record<string, unknown> | undefined;
  await withFetch((url, init) => {
    calls.push(url);
    if (url.startsWith('https://oauth2.googleapis.com')) return Response.json({ access_token: 'at', expires_in: 3600 });
    message = JSON.parse(init.body as string).message;
    return new Response('{}', { status: 200 });
  }, () => sendFcm(fcm, 'tok', payload));
  assertEquals(calls, ['https://oauth2.googleapis.com/token', 'https://fcm.googleapis.com/v1/projects/proj/messages:send']);
  assertEquals(message!.data, { event: 'e1', n: '3' });

  await withFetch(() => Response.json({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }, { status: 404 }), async () => {
    const e = await assertRejects(() => sendFcm(fcm, 'tok', payload), NativePushError);
    assertEquals(e.statusCode, 410);
  });
});
