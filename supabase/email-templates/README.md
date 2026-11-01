# Transaktionale E-Mails (Brevo SMTP + Supabase)

Die App hat **zwei getrennte Supabase-Projekte** (ein Tenant je Projekt). SMTP und die
Auth-E-Mail-Templates werden deshalb **pro Projekt** eingerichtet.

- `karlsruhe/` → Projekt **Roundnet Karlsruhe** (Markenfarbe `#0e876c`)
- `munich/` → Projekt **Roundnet München** (Markenfarbe `#6d0b0b`)

Die HTML-Dateien werden aus `render.mjs` generiert (eine Quelle, 2 Tenants × 6 Typen).
Nach Branding-Änderungen neu erzeugen:

```bash
node supabase/email-templates/render.mjs
```

---

## 1. Brevo einrichten (einmalig, ein Konto reicht für beide Vereine)

1. Konto auf [brevo.com](https://www.brevo.com) anlegen (Free-Tarif: **300 E-Mails/Tag**, geteilt über beide Tenants).
2. **Absenderdomain(s) verifizieren** – *Senders, Domains & Dedicated IPs → Domains*: beide Vereinsdomains hinzufügen und die angezeigten **SPF**- und **DKIM**-DNS-Einträge setzen. Ohne verifizierte Domain landen Mails im Spam.
3. **SMTP-Zugangsdaten holen** – *SMTP & API → SMTP*:
   - Server (Host): `smtp-relay.brevo.com`
   - Port: `587` (STARTTLS)
   - Login (Username): die angezeigte SMTP-Login-Adresse (z. B. `…@smtp-brevo.com`)
   - Passwort: der **SMTP-Key** (nicht das Brevo-Login-Passwort)
   - Dieselben Zugangsdaten gelten für **beide** Projekte – nur die Absenderadresse unterscheidet sich.

## 2. Custom SMTP je Supabase-Projekt

Im jeweiligen Projekt: **Authentication → Emails → SMTP Settings → Enable Custom SMTP**

| Feld | Karlsruhe | München |
|---|---|---|
| Sender email | `no-reply@<karlsruhe-domain>` | `no-reply@<münchen-domain>` |
| Sender name | `Roundnet Karlsruhe` | `Roundnet München` |
| Host | `smtp-relay.brevo.com` | `smtp-relay.brevo.com` |
| Port | `587` | `587` |
| Username | *(Brevo-SMTP-Login)* | *(Brevo-SMTP-Login)* |
| Password | *(Brevo-SMTP-Key)* | *(Brevo-SMTP-Key)* |

> Die Sender email muss auf einer in Brevo **verifizierten** Domain liegen.

## 3. Rate-Limits anheben

**Authentication → Rate Limits**: Der eingebaute Supabase-Mailer ist auf wenige Mails/Stunde
gedeckelt. Mit Custom SMTP das „Email sent"-Limit hochsetzen (z. B. **30–100/Stunde**, passend zur
Brevo-Tagesgrenze). So blockiert ein Schwung Passwort-Resets nicht sofort.

## 4. Site URL & Redirect URLs

**Authentication → URL Configuration** je Projekt:
- **Site URL** = die öffentliche App-URL des Tenants (wird in den Templates als `{{ .SiteURL }}`
  für Logo und Links verwendet).
- Die App-URL zusätzlich unter **Redirect URLs** eintragen, damit die Links in den Mails nach dem
  Klick wieder in der richtigen App landen.

## 5. Templates einsetzen

**Authentication → Emails** → je Vorlage den Inhalt der passenden Datei einfügen und den Betreff setzen:

| Supabase-Vorlage | Datei | Betreff (Karlsruhe) |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Bestätige deine Anmeldung bei Roundnet Karlsruhe |
| Invite user | `invite.html` | Du wurdest zu Roundnet Karlsruhe eingeladen |
| Magic Link | `magic-link.html` | Dein Login-Link für Roundnet Karlsruhe |
| Reset Password | `reset-password.html` | Passwort zurücksetzen – Roundnet Karlsruhe |
| Change Email Address | `change-email.html` | Bestätige deine neue E-Mail-Adresse – Roundnet Karlsruhe |
| Reauthentication | `reauthentication.html` | Dein Bestätigungscode – Roundnet Karlsruhe |

(Für München analog aus `munich/`; `render.mjs` gibt beim Lauf alle Betreffzeilen aus.)

## Verwendete GoTrue-Variablen

`{{ .ConfirmationURL }}` (Action-Link), `{{ .Token }}` (6-stelliger Code, Magic Link &
Reauthentication), `{{ .SiteURL }}` (Projekt-Site-URL, für Logo & Fallback), `{{ .NewEmail }}`
(Change Email). Diese stehen bewusst wörtlich im HTML und werden von Supabase beim Versand ersetzt.

## Design-Hinweise

- Responsiv, zentrierte Karte max. 480px, Light-/Dark-Mode über `prefers-color-scheme`.
- Bulletproof-Button (inkl. VML-Fallback für Outlook).
- Logo = `apple-touch-icon` des Tenants, aufgelöst gegen `{{ .SiteURL }}` – erscheint also erst
  korrekt, wenn die Site URL im Projekt gesetzt ist (beim lokalen Öffnen der Datei bleibt es leer).
