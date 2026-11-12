// One-off user remover (e.g. undo a member import).
//
// For every user in the CSV it removes the user's own data from the database, then the profile
// (public.user) and finally the login (Supabase auth). Shared records are kept and only lose the
// reference to the user: keys they hold, key handover history and bring items they created.
// Users with recorded matches are not touched (reported as error).
// Idempotent: a user that no longer exists is reported as "missing".
//
// Expected CSV header: id (required), name (optional, only for the output). Delimiter , or ;.
//
// Usage:
//   export SUPABASE_URL="https://<project>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # secret — never commit
//   node scripts/delete-users.mjs --csv users.csv --dry-run          # shows what would be deleted
//   node scripts/delete-users.mjs --csv users.csv [--out delete-result.csv]
//
// Output: result CSV, written row-by-row, with id, name, status (deleted|missing|error|dry-run),
// the number of removed rows per table and the error detail.
import { createClient } from '@supabase/supabase-js';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

// ---- args ----
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Fehlt: SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY (als Umgebungsvariablen).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- minimal CSV parser (handles quotes, , or ; delimiter, BOM, CRLF) ----
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.slice(0, text.indexOf('\n') >= 0 ? text.indexOf('\n') : text.length);
  const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Rows that belong to the user and are deleted, in an order that respects foreign keys
// (history before payments, everything before public.user).
const DELETE = [
  ['notifications', 'notification_outbox', 'user'],
  ['notifications', 'notifications', 'user'],
  ['notifications', 'user_notification_preferences', 'user'],
  ['notifications', 'web_push_subscriptions', 'user'],
  ['notifications', 'object_subscriptions', 'user'],
  ['public', 'object_subscriptions', 'user'],
  ['public', 'notification_token', 'user'],
  ['public', 'user_calendar_event_mapping', 'user'],
  ['public', 'user_calender_settings', 'user'],
  ['public', 'event_attendance_user_mapping', 'user'],
  ['public', 'event_bring_pledges', 'user'],
  ['public', 'event_comments', 'user'],
  ['public', 'challenge_stats', 'user'],
  ['public', 'user_activity', 'user'],
  ['public', 'group_user_mapping', 'user'],
  ['public', 'user_direct_grants', 'user'],
  ['public', 'user_grants', 'user'],
  ['public', 'history', 'user'],
  ['public', 'vouchers', 'user'],
  ['public', 'payments', 'user'],
  ['public', 'tournament_costs', 'user_id'],
  ['games', 'players', 'player'],
];

// Shared rows that stay; only the reference to the user is cleared.
const UNLINK = [
  ['public', 'items', 'current_holder'],
  ['public', 'item_history', 'current_user'],
  ['public', 'item_history', 'past_user'],
  ['public', 'event_bring_items', 'created_by'],
];

// A table from the list may not exist in every project (older/newer schema): skip it.
const missingTable = (error) =>
  ['42P01', 'PGRST205', 'PGRST106'].includes(error?.code) || /does not exist|could not find the table/i.test(error?.message ?? '');

const label = (schema, table, col) => `${schema === 'public' ? '' : schema + '.'}${table}${col === 'user' ? '' : '.' + col}`;

async function count(schema, table, col, id) {
  const { count: n, error } = await admin.schema(schema).from(table).select('*', { count: 'exact', head: true }).eq(col, id);
  if (error) { if (missingTable(error)) return 0; throw new Error(`${label(schema, table, col)}: ${error.message}`); }
  return n ?? 0;
}

async function remove(schema, table, col, id) {
  const { count: n, error } = await admin.schema(schema).from(table).delete({ count: 'exact' }).eq(col, id);
  if (error) { if (missingTable(error)) return 0; throw new Error(`${label(schema, table, col)}: ${error.message}`); }
  return n ?? 0;
}

async function unlink(schema, table, col, id) {
  const { count: n, error } = await admin.schema(schema).from(table).update({ [col]: null }, { count: 'exact' }).eq(col, id);
  if (error) { if (missingTable(error)) return 0; throw new Error(`${label(schema, table, col)}: ${error.message}`); }
  return n ?? 0;
}

async function run() {
  const csvPath = val('--csv');
  const dryRun = has('--dry-run');
  const outPath = val('--out', 'delete-result.csv');
  if (!csvPath) { console.error('Fehlt: --csv <pfad>'); process.exit(1); }

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const headers = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const iId = headers.indexOf('id');
  const iName = headers.indexOf('name');
  if (iId < 0) { console.error('Keine Spalte "id" gefunden. Header:', headers.join(' | ')); process.exit(1); }

  const cols = ['id', 'name', 'status', 'details', 'error'];
  writeFileSync(outPath, cols.join(',') + '\n', 'utf8');
  const record = (r) => appendFileSync(outPath, cols.map((c) => csvEscape(r[c])).join(',') + '\n', 'utf8');

  let deleted = 0, missing = 0, errors = 0;

  for (const r of rows) {
    const id = (r[iId] ?? '').trim();
    const name = iName >= 0 ? (r[iName] ?? '').trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      errors++;
      record({ id: id || '(leer)', name, status: 'error', error: 'ungültige id' });
      continue;
    }

    const details = [];
    try {
      const { data: profile } = await admin.from('user').select('id').eq('id', id).maybeSingle();
      const { data: auth } = await admin.auth.admin.getUserById(id);
      if (!profile && !auth?.user) {
        missing++;
        record({ id, name, status: 'missing' });
        console.log(`– ${name || id}: existiert nicht`);
        continue;
      }

      // Matches keep their players (ON DELETE RESTRICT): stop before anything is deleted.
      const { count: matches, error: mErr } = await admin.schema('games').from('match').select('id', { count: 'exact', head: true })
        .or(`a_player_1.eq.${id},a_player_2.eq.${id},b_player_1.eq.${id},b_player_2.eq.${id}`);
      if (mErr) throw new Error(`games.match: ${mErr.message}`);
      if (matches) throw new Error(`hat ${matches} Spiele in games.match – nicht gelöscht`);

      if (dryRun) {
        for (const [s, t, c] of DELETE) { const n = await count(s, t, c, id); if (n) details.push(`${label(s, t, c)}: ${n}`); }
        for (const [s, t, c] of UNLINK) { const n = await count(s, t, c, id); if (n) details.push(`${label(s, t, c)} (Verweis): ${n}`); }
        record({ id, name, status: 'dry-run', details: details.join(' | ') });
        console.log(`· ${name || id}: ${details.join(', ') || 'keine weiteren Daten'}`);
        continue;
      }

      for (const [s, t, c] of UNLINK) { const n = await unlink(s, t, c, id); if (n) details.push(`${label(s, t, c)} (Verweis): ${n}`); }
      for (const [s, t, c] of DELETE) { const n = await remove(s, t, c, id); if (n) details.push(`${label(s, t, c)}: ${n}`); }

      if (profile) {
        const { error } = await admin.from('user').delete().eq('id', id);
        if (error) throw new Error(`user: ${error.message}`);
      }
      if (auth?.user) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw new Error(`auth: ${error.message}`);
      }

      deleted++;
      record({ id, name, status: 'deleted', details: details.join(' | ') });
      console.log(`✓ ${name || id}${details.length ? ` (${details.join(', ')})` : ''}`);
    } catch (e) {
      errors++;
      record({ id, name, status: 'error', details: details.join(' | '), error: e?.message ?? String(e) });
      console.log(`✗ ${name || id}: ${e?.message ?? e}`);
    }
  }

  console.log(`\nFertig${dryRun ? ' (DRY RUN – nichts gelöscht)' : ''}:`);
  console.log(`  gelöscht: ${deleted} | existierten nicht: ${missing} | Fehler: ${errors}`);
  console.log(`  Ergebnis-CSV: ${outPath}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
