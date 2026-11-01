// Renders the Supabase auth email templates for every tenant from one source.
//
//   node supabase/email-templates/render.mjs
//
// Output: supabase/email-templates/<tenant>/<type>.html — paste each file's contents
// into that tenant's Supabase project (Authentication → Emails → the matching template).
// The subjects are printed at the end; set them in the same screen.
//
// Supabase (GoTrue) substitutes {{ .ConfirmationURL }}, {{ .Token }}, {{ .SiteURL }},
// {{ .Email }}, {{ .NewEmail }} at send time — those are left verbatim in the markup.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Per-tenant branding. `iconPrefix` is the public folder that serves the app icons. */
const TENANTS = [
  { key: 'karlsruhe', name: 'Roundnet Karlsruhe', brand: '#0e876c', brandDark: '#14a884', iconPrefix: 'roundnet-karlsruhe' },
  { key: 'munich',    name: 'Roundnet München',   brand: '#6d0b0b', brandDark: '#c0392b', iconPrefix: 'munich-roundnet' },
];

// The logo is the app's apple-touch-icon, served per tenant and resolved at send time
// against the project's configured Site URL.
const logoUrl = (t) => `{{ .SiteURL }}/${t.iconPrefix}/apple-touch-icon.png`;

const BTN = '{{ .ConfirmationURL }}';

/** type -> content. `button`/`code` decide which blocks render. */
const TEMPLATES = {
  'confirm-signup': {
    file: 'confirm-signup.html',
    label: 'Confirm signup',
    subject: (t) => `Bestätige deine Anmeldung bei ${t.name}`,
    preheader: 'Nur noch ein Klick, dann ist dein Account aktiv.',
    title: (t) => `Willkommen bei ${t.name}!`,
    intro: 'Schön, dass du dabei bist. Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren.',
    button: { label: 'E-Mail bestätigen', url: BTN },
    outro: 'Der Bestätigungslink ist 24 Stunden gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.',
  },
  invite: {
    file: 'invite.html',
    label: 'Invite user',
    subject: (t) => `Du wurdest zu ${t.name} eingeladen`,
    preheader: 'Richte deinen Account ein und setze dein Passwort.',
    title: () => 'Du bist eingeladen 🎉',
    intro: 'Du wurdest in die App eingeladen. Klicke unten, um deinen Account einzurichten und ein Passwort zu vergeben.',
    button: { label: 'Einladung annehmen', url: BTN },
    outro: 'Falls du keine Einladung erwartest, kannst du diese E-Mail einfach ignorieren.',
  },
  'magic-link': {
    file: 'magic-link.html',
    label: 'Magic Link',
    subject: (t) => `Dein Login-Link für ${t.name}`,
    preheader: 'Mit einem Klick anmelden – kein Passwort nötig.',
    title: () => 'Einmal-Login',
    intro: 'Klicke auf den Button, um dich anzumelden. Alternativ kannst du diesen Code in der App eingeben:',
    code: '{{ .Token }}',
    button: { label: 'Jetzt anmelden', url: BTN },
    outro: 'Link und Code sind 60 Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.',
  },
  'reset-password': {
    file: 'reset-password.html',
    label: 'Reset Password',
    subject: (t) => `Passwort zurücksetzen – ${t.name}`,
    preheader: 'Setze jetzt ein neues Passwort.',
    title: () => 'Passwort zurücksetzen',
    intro: 'Du hast angefordert, dein Passwort zurückzusetzen. Klicke unten, um ein neues Passwort zu vergeben.',
    button: { label: 'Neues Passwort setzen', url: BTN },
    outro: 'Wenn du das nicht warst, kannst du diese E-Mail ignorieren – dein Passwort bleibt dann unverändert.',
  },
  'change-email': {
    file: 'change-email.html',
    label: 'Change Email Address',
    subject: (t) => `Bestätige deine neue E-Mail-Adresse – ${t.name}`,
    preheader: 'Bestätige die Änderung deiner E-Mail-Adresse.',
    title: () => 'Neue E-Mail bestätigen',
    intro: 'Bestätige, dass <strong>{{ .NewEmail }}</strong> künftig für deinen Account verwendet werden soll.',
    button: { label: 'Neue E-Mail bestätigen', url: BTN },
    outro: 'Wenn du diese Änderung nicht angefordert hast, ändere bitte umgehend dein Passwort.',
  },
  reauthentication: {
    file: 'reauthentication.html',
    label: 'Reauthentication',
    subject: (t) => `Dein Bestätigungscode – ${t.name}`,
    preheader: 'Dein Sicherheits-Code.',
    title: () => 'Bestätigungscode',
    intro: 'Gib diesen Code in der App ein, um die Aktion zu bestätigen:',
    code: '{{ .Token }}',
    outro: 'Der Code ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.',
  },
};

function button(t, b) {
  return `
            <tr>
              <td style="padding:28px 0 8px;">
                <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${b.url}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="20%" fillcolor="${t.brand}" stroke="f"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${b.label}</center></v:roundrect><![endif]-->
                <!--[if !mso]><!-- -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${t.brand}" style="border-radius:10px;">
                      <a href="${b.url}" target="_blank"
                         style="display:inline-block;padding:14px 32px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">
                        ${b.label}
                      </a>
                    </td>
                  </tr>
                </table>
                <!--<![endif]-->
              </td>
            </tr>`;
}

function code(value) {
  return `
            <tr>
              <td style="padding:20px 0 4px;">
                <div class="code" style="display:inline-block;padding:16px 24px;background:#f1f5f4;border:1px solid #e3e8e6;border-radius:12px;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;">
                  ${value}
                </div>
              </td>
            </tr>`;
}

function linkFallback(url) {
  return `
            <tr>
              <td style="padding:16px 0 0;">
                <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#8a8f98;">Button funktioniert nicht? Kopiere diesen Link in deinen Browser:</p>
                <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;">
                  <a href="${url}" target="_blank" style="color:#8a8f98;text-decoration:underline;">${url}</a>
                </p>
              </td>
            </tr>`;
}

function render(t, def) {
  const title = def.title(t);
  const bodyRows = [
    `
            <tr>
              <td style="padding:4px 0 0;">
                <h1 style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:23px;line-height:30px;font-weight:700;color:#111827;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0 0;">
                <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#3f3f46;">${def.intro}</p>
              </td>
            </tr>`,
    def.code ? code(def.code) : '',
    def.button ? button(t, def.button) : '',
    def.button ? linkFallback(def.button.url) : '',
    `
            <tr>
              <td style="padding:22px 0 0;">
                <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;color:#8a8f98;">${def.outro}</p>
              </td>
            </tr>`,
  ].join('');

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; width:100% !important; background:#eef1f0; }
    a { color:${t.brand}; }
    @media (prefers-color-scheme: dark) {
      body, .bg { background:#0b0b0c !important; }
      .card { background:#161618 !important; border-color:#262629 !important; }
      .title, h1 { color:#f4f4f5 !important; }
      .text { color:#d4d4d8 !important; }
      .muted { color:#9ca3af !important; }
      .code { background:#1f1f22 !important; border-color:#2e2e31 !important; color:#f4f4f5 !important; }
      .brandname { color:#f4f4f5 !important; }
    }
  </style>
</head>
<body class="bg" style="margin:0;padding:0;background:#eef1f0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${def.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#eef1f0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:480px;">
          <!-- brand bar -->
          <tr><td style="height:4px;background:${t.brand};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- card -->
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid #e6e8e7;border-top:0;border-radius:0 0 16px 16px;padding:32px 36px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="${logoUrl(t)}" width="40" height="40" alt="${t.name}"
                               style="display:block;width:40px;height:40px;border-radius:9px;">
                        </td>
                        <td style="vertical-align:middle;">
                          <span class="brandname" style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#111827;">${t.name}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${bodyRows}
              </table>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:20px 8px 0;">
              <p class="muted" style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
                Diese E-Mail wurde automatisch von der ${t.name}-App gesendet.<br>
                Bitte antworte nicht direkt auf diese Nachricht.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

const subjects = {};
for (const t of TENANTS) {
  subjects[t.key] = {};
  for (const [type, def] of Object.entries(TEMPLATES)) {
    const html = render(t, def);
    const dir = join(HERE, t.key);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, def.file), html, 'utf8');
    subjects[t.key][def.label] = def.subject(t);
  }
}

console.log('Rendered templates for:', TENANTS.map((t) => t.key).join(', '));
for (const t of TENANTS) {
  console.log(`\n### ${t.name}  (Supabase-Projekt: ${t.key})`);
  for (const [label, subject] of Object.entries(subjects[t.key])) {
    console.log(`  - ${label.padEnd(22)} → Betreff: ${subject}`);
  }
}
