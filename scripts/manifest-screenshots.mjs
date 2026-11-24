// Takes the screenshots the web app manifest shows in Android's install dialog (vite.config.js → screenshots).
// The app runs on a Vite dev server against a faked Supabase API with demo data, so no backend is needed.
//
//   node scripts/manifest-screenshots.mjs karlsruhe
//   node scripts/manifest-screenshots.mjs munich
//
// Writes public/<tenant>/screenshots/*.jpg. Re-run after bigger UI changes.
import { chromium } from 'playwright';
import { loadEnv } from 'vite';
import { createServer } from 'vite';

const mode = process.argv[2];
if (!mode) throw new Error('Usage: node scripts/manifest-screenshots.mjs <karlsruhe|munich>');

const API = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_URL = API;
process.env.VITE_SUPABASE_ANON_KEY = 'demo';
process.env.VITE_VAPID_PUBLIC_KEY = '';
const env = loadEnv(mode, 'environments', '');
const isMunich = env.VITE_WEBSITE_PATH === 'munich-roundnet';
const outDir = `public/${env.VITE_ICON_PREFIX}/screenshots`;

// --- Demo data -------------------------------------------------------------------------------------------

const UID = '11111111-1111-4111-8111-111111111111';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, exp: 4102444800, role: 'authenticated' })}.demo`;
const authUser = { id: UID, email: 'lena@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2025-01-01T00:00:00Z' };
const user = { id: UID, email: 'lena@example.com', name: 'Lena Weber', displayName: 'Lena', avatarUrl: null, created_at: '2025-01-01T00:00:00Z', disabled: false, language: 'de', last_seen_at: null, role: 'user', verified: true };

const city = isMunich ? 'München' : 'Karlsruhe';
const group = (id, name, color) => ({ id, name, color, created_at: '2025-01-01T00:00:00Z', description: '', is_public: true, need_request_to_join: false, parent_group: null, visible: true });
const groups = [group('g1', `Training ${city}`, isMunich ? '#6d0505' : '#0e876c'), group('g2', 'Turnierteam', '#2563eb'), group('g3', 'Anfänger', '#d97706')];

const at = (days, hour) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setUTCHours(hour - 1, 0, 0, 0); // Europe/Berlin in winter
  return date.toISOString();
};
const place = (name, description) => JSON.stringify({ name, description, lat: 49.0069, lon: 8.4037 });
const hall = isMunich ? place('Sporthalle Theresienhöhe', 'Theresienhöhe 7, München') : place('Sporthalle Otto-Hahn-Gymnasium', 'Kapellenstraße 9, Karlsruhe');
const park = isMunich ? place('Englischer Garten', 'München') : place('Schlossgarten', 'Karlsruhe');
let eventId = 0;
const event = (days, hour, hours, title, eventGroup, eventPlace, state, attending) => ({
  id: `e${++eventId}`, title, group: eventGroup.id, event_group: eventGroup, startingDateTime: at(days, hour), endDateTime: at(days, hour + hours),
  meetingDateTime: null, answerDeadline: null, answerStart: null, attending_count: attending, declined_count: 2, description: '', isCancelled: false,
  key: null, max_trial_attendees: null, maxAttendees: 16, place: eventPlace, recurrence: 'Weekly', recurrenceEnd: null, required_item: null,
  trials_open: false, user_group_role: 'user', user_state: state, created_at: '2025-01-01T00:00:00Z', constellations_enabled: false,
});
const events = [
  event(0, 19, 2, 'Abendtraining', groups[0], hall, 'Attending', 11),
  event(1, 18, 2, 'Turniervorbereitung', groups[1], hall, null, 7),
  event(2, 17, 2, `Roundnet im ${isMunich ? 'Englischen Garten' : 'Park'}`, groups[2], park, null, 5),
  event(3, 19, 2, 'Abendtraining', groups[0], hall, 'Attending', 9),
  event(5, 10, 6, `${city} Open`, groups[1], park, 'Declined', 14),
  event(7, 19, 2, 'Abendtraining', groups[0], hall, null, 3),
];
const notification = (hoursAgo, title, body, read) => ({
  id: `n${hoursAgo}`, title, body, created_at: new Date(Date.now() - hoursAgo * 3600e3).toISOString(), data: null,
  dismissed_at: read ? new Date().toISOString() : null, expires_at: null, read_at: null, source_id: null, source_type: 'event', tenant: mode, topic: 'event', user: UID,
});
const tables = {
  user: [user],
  group_user_mapping: groups.map((x) => ({ user: UID, group: x.id, role: 'user', event_group: x })),
  user_grants_view: [{ kind: 'feat', key: 'events' }],
  events_user_view: events,
  event_groups_view: groups.map((x) => ({ ...x, user_group_role: 'user' })),
  notifications: [
    notification(1, 'Neues Training', 'Turniervorbereitung morgen, 18:00', false),
    notification(5, 'Erinnerung', 'Abendtraining heute um 19:00', false),
    notification(26, 'Gruppe beigetreten', 'Du bist jetzt im Turnierteam', true),
    notification(50, 'Training abgesagt', 'Das Training fällt wegen Regen aus', true),
  ],
};

// --- Screens --------------------------------------------------------------------------------------------

const shots = [
  { name: 'home', path: '/home', form: 'narrow' },
  { name: 'events', path: '/training/list', form: 'narrow' },
  { name: 'notifications', path: '/notifications', form: 'narrow' },
  { name: 'events-wide', path: '/training/list', form: 'wide' },
];
const sizes = { narrow: { width: 412, height: 915 }, wide: { width: 1280, height: 800 } };

const server = await createServer({ mode, server: { port: 5199, strictPort: true }, logLevel: 'warn' });
await server.listen();
// Optional: a preinstalled Chromium instead of the one bundled with this Playwright version (as in playwright.config.ts).
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
try {
  for (const shot of shots) {
    const context = await browser.newContext({ viewport: sizes[shot.form], deviceScaleFactor: shot.form === 'narrow' ? 2 : 1, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
    await context.addInitScript(([session]) => {
      localStorage.setItem('sb-127-auth-token', session);
      localStorage.setItem('pwa:installCardDismissed', 'true');
      localStorage.setItem('i18nextLng', 'de');
    }, [JSON.stringify({ access_token: jwt, refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: authUser })]);
    await context.route(`${API}/**`, (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/auth/v1/user') return route.fulfill({ json: authUser });
      const rows = tables[url.pathname.replace('/rest/v1/', '')] ?? [];
      const single = (route.request().headers().accept ?? '').includes('object');
      return route.fulfill(single ? { json: rows[0] ?? null, status: rows[0] ? 200 : 406 } : { json: rows });
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:5199${shot.path}`);
    await page.waitForTimeout(4000); // lazy routes, fonts and queries
    await page.screenshot({ path: `${outDir}/${shot.name}.jpg`, type: 'jpeg', quality: 80 });
    await context.close();
    console.log(`${outDir}/${shot.name}.jpg`);
  }
} finally {
  await browser.close();
  await server.close();
}
