// One-off member importer (e.g. Spond → App migration for Munich).
//
// Creates an auth account per CSV row WITHOUT sending any email (admin.createUser with
// email_confirm), adds the user to a group, and optionally links the RG-ID to a player.
// Idempotent: existing emails are reused (no duplicate, no new password).
//
// Expected CSV header (order/extra columns don't matter; delimiter , or ; auto-detected):
//   Mitglied, Vorname, Nachname, Geburtstag, Geburtsjahr, Alter, Mitgliedschaft, Kommunikation, Email, RG-ID
// Only Vorname, Nachname, Email and RG-ID are used.
//
// Usage:
//   export SUPABASE_URL="https://<project>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # secret — never commit
//   node scripts/import-members.mjs --list-groups            # find the group id
//   node scripts/import-members.mjs --csv members.csv --group <group-uuid> [--dry-run] [--no-rg-link] [--reset-existing] [--out result.csv]
//
// --reset-existing: for a row whose account already exists, set a FRESH temp password
//   (admin.updateUserById). Use this to recover after an interrupted run where the result CSV
//   (and thus the generated passwords) was lost — re-run the same CSV with this flag and every
//   row ends with a known password. Without it, existing accounts are left untouched.
//
// Output: result CSV, written row-by-row (an interrupted run keeps what it already did), with
// email, name, status (created|reset|exists|error), tempPassword (for created/reset), userId,
// group, rgLinked. Handle it securely and delete it after handing out the passwords.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
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

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (headers, ...cands) => {
  const n = headers.map(norm);
  for (const c of cands) { const i = n.indexOf(c); if (i >= 0) return i; }
  return -1;
};

const tempPassword = () =>
  // readable-ish, no ambiguous chars, 14 chars
  randomBytes(14).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) +
  Math.floor(100 + Math.random() * 900); // ensure digits + length ≥ 6

const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function listGroups() {
  const { data, error } = await admin.from('event_group').select('id, name').order('name');
  if (error) throw error;
  console.log('Gruppen:');
  for (const g of data) console.log(`  ${g.id}  ${g.name}`);
}

/** email -> auth user id, across all existing users (paginated). */
async function existingUsersByEmail() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

async function run() {
  if (has('--list-groups')) { await listGroups(); return; }

  const csvPath = val('--csv');
  const groupId = val('--group');
  const dryRun = has('--dry-run');
  const rgLink = !has('--no-rg-link');
  const resetExisting = has('--reset-existing');
  const outPath = val('--out', 'import-result.csv');
  if (!csvPath) { console.error('Fehlt: --csv <pfad>'); process.exit(1); }
  if (!groupId) { console.error('Fehlt: --group <uuid>  (ermittele ihn mit --list-groups)'); process.exit(1); }

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const headers = rows.shift() ?? [];
  const iEmail = pick(headers, 'email', 'emailadresse', 'mail');
  const iVor = pick(headers, 'vorname', 'voname'); // tolerate the typo in the sample header
  const iNach = pick(headers, 'nachname', 'nachnae');
  const iRg = pick(headers, 'rgid');
  if (iEmail < 0) { console.error('Keine Email-Spalte gefunden. Header:', headers.join(' | ')); process.exit(1); }

  const existing = await existingUsersByEmail();

  // Write the result CSV incrementally so an interrupted run keeps what it already did.
  const cols = ['email', 'name', 'status', 'tempPassword', 'userId', 'group', 'rgLinked', 'detail'];
  if (!dryRun) writeFileSync(outPath, cols.join(',') + '\n', 'utf8');
  const record = (r) => { if (!dryRun) appendFileSync(outPath, cols.map((c) => csvEscape(r[c])).join(',') + '\n', 'utf8'); };

  let created = 0, reset = 0, exists = 0, errors = 0, grouped = 0, linked = 0;

  for (const r of rows) {
    const email = (r[iEmail] ?? '').trim().toLowerCase();
    const vorname = (iVor >= 0 ? r[iVor] : '').trim();
    const nachname = (iNach >= 0 ? r[iNach] : '').trim();
    const rgid = (iRg >= 0 ? r[iRg] : '').trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      const row = { email: email || '(leer)', name: `${vorname} ${nachname}`.trim(), status: 'error', detail: 'ungültige Email' };
      record(row);
      errors++;
      continue;
    }

    const name = `${vorname} ${nachname}`.trim() || email;
    const displayName = vorname || name;
    let userId = existing.get(email);
    let status, tempPw = '';

    try {
      if (userId) {
        if (resetExisting && !dryRun) {
          // Set a fresh known password for an account that already exists (recovery path).
          tempPw = tempPassword();
          const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPw });
          if (error) throw error;
          status = 'reset';
          reset++;
        } else {
          status = 'exists';
          exists++;
        }
      } else {
        tempPw = tempPassword();
        if (dryRun) {
          userId = '(dry-run)';
        } else {
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password: tempPw,
            email_confirm: true,
            user_metadata: { name, displayName, email, role: 'user' },
          });
          if (error) throw error;
          userId = data.user.id;
          existing.set(email, userId);
        }
        status = 'created';
        created++;
      }

      // group membership (idempotent via composite PK group+user)
      let groupAdded = false;
      if (!dryRun) {
        const { error } = await admin
          .from('group_user_mapping')
          .upsert({ group: groupId, user: userId, role: 'user' }, { onConflict: 'group,user', ignoreDuplicates: true });
        if (error) throw error;
      }
      groupAdded = true;
      grouped++;

      // best-effort RG-ID → player link
      let rgLinked = false;
      if (rgLink && rgid && !dryRun && userId !== '(dry-run)') {
        const { data, error } = await admin
          .schema('games')
          .from('players')
          .update({ linked_user_id: userId })
          .eq('rg_id', rgid)
          .is('linked_user_id', null)
          .select('player');
        if (!error && data && data.length) { rgLinked = true; linked++; }
      }

      record({ email, name, status, tempPassword: tempPw, userId, group: groupAdded ? 'ok' : '', rgLinked: rgLinked ? 'ok' : (rgid ? 'kein Treffer' : '') });
    } catch (e) {
      errors++;
      record({ email, name, status: 'error', detail: e?.message ?? String(e) });
    }
  }

  console.log(`\nFertig${dryRun ? ' (DRY RUN – nichts geschrieben)' : ''}:`);
  console.log(`  erstellt: ${created} | zurückgesetzt: ${reset} | existierten: ${exists} | Fehler: ${errors}`);
  console.log(`  Gruppen-Zuordnungen: ${grouped} | RG-Verknüpfungen: ${linked}`);
  console.log(`  Ergebnis-CSV: ${outPath}  (enthält temporäre Passwörter – sicher behandeln & danach löschen)`);
}

run().catch((e) => { console.error(e); process.exit(1); });
