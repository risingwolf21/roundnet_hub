// Seeds a set of test personas into the LOCAL Supabase stack for manual testing of
// group-scoped access and grants. See docs/TEST_PLAN.md ("Manual persona check").
//
//   yarn seed:personas            create / refresh personas, groups, grants and events
//   yarn seed:personas --remove   delete everything this script created
//
// Every persona logs in with PASSWORD below.
import { Database } from '../src/types/supabase-generated.types';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', 'environments', '');
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !/localhost|127\.0\.0\.1/.test(url)) {
  console.error(`Refusing to run: VITE_SUPABASE_URL (${url}) is not a local Supabase stack.`);
  process.exit(1);
}
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing in environments/.env.local');
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const PASSWORD = 'persona-password';
const GROUP_A = '0000a000-0000-4000-8000-00000000000a'; // closed group, join needs a request
const GROUP_B = '0000b000-0000-4000-8000-00000000000b'; // public group, open to join
const EVENT_A = '0000a000-0000-4000-8000-0000000000e1';
const EVENT_B = '0000b000-0000-4000-8000-0000000000e2';

type Role = Database['public']['Enums']['GroupRole'];
type Persona = {
  key: string;
  name: string;
  groupA?: Role;
  groupB?: Role;
  directPerms?: string[];
  directFeats?: string[];
};

const ALL_FEATURES = ['costs', 'challenges', 'drinks', 'events', 'games', 'items'];

const PERSONAS: Persona[] = [
  { key: 'outsider', name: 'Persona Outsider' },
  { key: 'member', name: 'Persona Member', groupA: 'user' },
  { key: 'trial', name: 'Persona Trial', groupA: 'trial' },
  { key: 'requested', name: 'Persona Requested', groupA: 'joinRequested' },
  { key: 'groupadmin', name: 'Persona Group Admin', groupA: 'admin' },
  { key: 'memberb', name: 'Persona Member B', groupB: 'user' },
  {
    key: 'platformadmin',
    name: 'Persona Platform Admin',
    directPerms: [
      'supabase.admin',
      'grants.manage',
      'groups.manage.admin',
      'users.manage',
      'reset_user_password',
      'admin.analytics.view',
      'admin.notify_users',
      'drinks.manage',
      'drinks.history.admin',
      'drinks.confirm.payments',
      'games.admin.merge_accounts',
    ],
    directFeats: ALL_FEATURES,
  },
];

// What a normal member of group A may do; trial members only get events + event.signup from this.
const GROUP_A_PERMS = [
  'event.signup',
  'event.comment',
  'drinks.select',
  'drinks.purchase',
  'drinks.view.own-history',
  'drinks.view.own-payments',
  'games.select',
  'games.create',
  'games.view.own',
  'games.update.score',
  'challenges.stats.read',
  'items.update.holder',
];
const GROUP_B_PERMS = ['event.signup', 'event.comment'];

const emailOf = (key: string) => `${key}@persona.test`;

async function findUserId(email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }
}

async function ensureUser(persona: Persona) {
  const email = emailOf(persona.key);
  let id = await findUserId(email);
  if (id) {
    await admin.auth.admin.updateUserById(id, { password: PASSWORD });
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw error ?? new Error(`could not create ${email}`);
    id = data.user.id;
  }
  await admin.from('user').update({ displayName: persona.name, name: persona.name }).eq('id', id).throwOnError();
  return id;
}

async function seed() {
  const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000);
  inTwoDays.setUTCHours(17, 0, 0, 0);
  const end = new Date(inTwoDays.getTime() + 2 * 3600 * 1000);

  await admin
    .from('event_group')
    .upsert([
      { id: GROUP_A, name: 'Persona Group A (closed)', description: 'Seeded by scripts/seed-test-personas.ts', is_public: false, need_request_to_join: true, visible: true },
      { id: GROUP_B, name: 'Persona Group B (public)', description: 'Seeded by scripts/seed-test-personas.ts', is_public: true, need_request_to_join: false, visible: true },
    ])
    .throwOnError();

  await admin
    .from('group_features')
    .upsert([
      ...ALL_FEATURES.map((feature) => ({ group: GROUP_A, feature })),
      { group: GROUP_A, feature: 'events.trials' },
      { group: GROUP_B, feature: 'events' },
    ])
    .throwOnError();
  await admin
    .from('group_permissions')
    .upsert([
      ...GROUP_A_PERMS.map((permission) => ({ group: GROUP_A, permission })),
      ...GROUP_B_PERMS.map((permission) => ({ group: GROUP_B, permission })),
    ])
    .throwOnError();

  await admin
    .from('events')
    .upsert([
      { id: EVENT_A, group: GROUP_A, title: 'Persona Training A', startingDateTime: inTwoDays.toISOString(), endDateTime: end.toISOString() },
      { id: EVENT_B, group: GROUP_B, title: 'Persona Training B', startingDateTime: inTwoDays.toISOString(), endDateTime: end.toISOString() },
    ])
    .throwOnError();

  const rows: { persona: string; email: string; groupA: string; groupB: string; direct: string }[] = [];
  for (const persona of PERSONAS) {
    const id = await ensureUser(persona);

    await admin.from('group_user_mapping').delete().eq('user', id).in('group', [GROUP_A, GROUP_B]).throwOnError();
    const mappings = [
      persona.groupA && { user: id, group: GROUP_A, role: persona.groupA },
      persona.groupB && { user: id, group: GROUP_B, role: persona.groupB },
    ].filter(Boolean) as { user: string; group: string; role: Role }[];
    if (mappings.length) await admin.from('group_user_mapping').insert(mappings).throwOnError();

    await admin.from('user_direct_grants').delete().eq('user', id).throwOnError();
    const grants = [
      ...(persona.directPerms ?? []).map((key) => ({ user: id, kind: 'perm' as const, key })),
      ...(persona.directFeats ?? []).map((key) => ({ user: id, kind: 'feat' as const, key })),
    ];
    if (grants.length) await admin.from('user_direct_grants').insert(grants).throwOnError();

    rows.push({
      persona: persona.name,
      email: emailOf(persona.key),
      groupA: persona.groupA ?? '-',
      groupB: persona.groupB ?? '-',
      direct: persona.directPerms ? `${persona.directPerms.length} perms, all feats` : '-',
    });
  }

  console.table(rows);
  console.log(`Password for all personas: ${PASSWORD}`);
  console.log(`Events: "Persona Training A" (group A) and "Persona Training B" (group B), ${inTwoDays.toISOString()}`);
}

async function remove() {
  for (const persona of PERSONAS) {
    const id = await findUserId(emailOf(persona.key));
    if (!id) continue;
    // public.user / games.players reference auth.users without ON DELETE CASCADE
    await admin.from('user_direct_grants').delete().eq('user', id);
    await admin.from('group_user_mapping').delete().eq('user', id);
    await admin.from('event_attendance_user_mapping').delete().eq('user', id);
    await admin.from('event_comments').delete().eq('user', id);
    await admin.schema('games').from('players').delete().or(`linked_user_id.eq.${id},player.eq.${id}`);
    await admin.from('user').delete().eq('id', id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.warn(`could not delete ${persona.key}: ${error.message}`);
  }
  await admin.from('event_attendance_user_mapping').delete().in('event', [EVENT_A, EVENT_B]);
  await admin.from('event_comments').delete().in('event', [EVENT_A, EVENT_B]);
  await admin.from('events').delete().in('id', [EVENT_A, EVENT_B]);
  await admin.from('event_group').delete().in('id', [GROUP_A, GROUP_B]);
  console.log('Persona test data removed.');
}

(process.argv.includes('--remove') ? remove() : seed()).catch((error) => {
  console.error(error);
  process.exit(1);
});
