// Senders for the store apps: APNs (iOS) and FCM (Android). No dependencies, only fetch + WebCrypto.

export type NativePayload = {
  title: string;
  body: string;
  data: Record<string, unknown>;
  ttlSeconds?: number | null;
  highPriority?: boolean;
};

// statusCode is normalised for the worker: 410 = token is dead (revoke it), 429/5xx = retry,
// 0 = our own configuration is wrong (never revoke the token for that, report it instead).
export class NativePushError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

const b64url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToDer = (pem: string) => {
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const raw = atob(body);
  const der = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  return der.buffer;
};

export async function signJwt(
  header: Record<string, unknown>,
  claims: Record<string, unknown>,
  pem: string,
  alg: 'ES256' | 'RS256',
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signingInput = `${b64url(JSON.stringify({ alg, typ: 'JWT', ...header }))}.${b64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(signature)}`;
}

// ---------------------------------------------------------------- APNs

export type ApnsConfig = {
  keyP8: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  sandbox: boolean;
};

let apnsJwt: { value: string; at: number } | null = null;

async function apnsToken(cfg: ApnsConfig) {
  const now = Math.floor(Date.now() / 1000);
  // Apple wants a fresh token between 20 and 60 minutes.
  if (apnsJwt && now - apnsJwt.at < 40 * 60) return apnsJwt.value;
  const value = await signJwt({ kid: cfg.keyId }, { iss: cfg.teamId, iat: now }, cfg.keyP8, 'ES256');
  apnsJwt = { value, at: now };
  return value;
}

const APNS_DEAD_TOKEN_REASONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic']);

export async function sendApns(cfg: ApnsConfig, token: string, p: NativePayload): Promise<void> {
  const host = cfg.sandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const headers: Record<string, string> = {
    authorization: `bearer ${await apnsToken(cfg)}`,
    'apns-topic': cfg.bundleId,
    'apns-push-type': 'alert',
    'apns-priority': p.highPriority === false ? '5' : '10',
    'content-type': 'application/json',
  };
  if (p.ttlSeconds) headers['apns-expiration'] = String(Math.floor(Date.now() / 1000) + p.ttlSeconds);

  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: 'POST',
    headers,
    // Custom keys sit next to `aps` so the app gets them as notification.data on both platforms.
    body: JSON.stringify({ ...p.data, aps: { alert: { title: p.title, body: p.body }, sound: 'default' } }),
  });
  if (res.ok) {
    await res.body?.cancel();
    return;
  }

  const reason = (await res.json().catch(() => ({})))?.reason ?? `http ${res.status}`;
  if (res.status === 410 || APNS_DEAD_TOKEN_REASONS.has(reason)) throw new NativePushError(410, `APNs: ${reason}`);
  if (res.status === 429 || res.status >= 500) throw new NativePushError(res.status, `APNs: ${reason}`);
  throw new NativePushError(0, `APNs: ${reason}`);
}

// ---------------------------------------------------------------- FCM

export type FcmConfig = { projectId: string; clientEmail: string; privateKey: string };

let fcmAccess: { value: string; expiresAt: number } | null = null;

async function fcmAccessToken(cfg: FcmConfig) {
  const now = Math.floor(Date.now() / 1000);
  if (fcmAccess && fcmAccess.expiresAt - 60 > now) return fcmAccess.value;
  const assertion = await signJwt({}, {
    iss: cfg.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, cfg.privateKey, 'RS256');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new NativePushError(0, `FCM auth failed: http ${res.status}`);
  const json = await res.json();
  fcmAccess = { value: json.access_token, expiresAt: now + Number(json.expires_in ?? 3600) };
  return fcmAccess.value;
}

export async function sendFcm(cfg: FcmConfig, token: string, p: NativePayload): Promise<void> {
  // FCM only accepts string values in `data`.
  const data = Object.fromEntries(
    Object.entries(p.data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await fcmAccessToken(cfg)}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data,
        android: {
          priority: p.highPriority === false ? 'NORMAL' : 'HIGH',
          ...(p.ttlSeconds ? { ttl: `${p.ttlSeconds}s` } : {}),
        },
      },
    }),
  });
  if (res.ok) {
    await res.body?.cancel();
    return;
  }

  const err = (await res.json().catch(() => ({})))?.error;
  const code: string = err?.details?.find?.((d: { errorCode?: string }) => d.errorCode)?.errorCode ?? err?.status ?? `http ${res.status}`;
  if (res.status === 404 || code === 'UNREGISTERED') throw new NativePushError(410, `FCM: ${code}`);
  if (res.status === 429 || res.status >= 500) throw new NativePushError(res.status, `FCM: ${code}`);
  throw new NativePushError(0, `FCM: ${code}`);
}

export function loadNativeConfig(env: { get(key: string): string | undefined }) {
  const p8 = env.get('APNS_KEY_P8');
  const keyId = env.get('APNS_KEY_ID');
  const teamId = env.get('APNS_TEAM_ID');
  const bundleId = env.get('APNS_BUNDLE_ID');
  const apns: ApnsConfig | null = p8 && keyId && teamId && bundleId
    ? { keyP8: p8.replace(/\\n/g, '\n'), keyId, teamId, bundleId, sandbox: env.get('APNS_ENV') === 'sandbox' }
    : null;

  let fcm: FcmConfig | null = null;
  const raw = env.get('FCM_SERVICE_ACCOUNT');
  if (raw) {
    const sa = JSON.parse(raw);
    fcm = { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key };
  }
  return { apns, fcm };
}
