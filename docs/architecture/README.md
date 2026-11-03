# Architecture diagrams

Focused diagrams of the Roundnet club app, made with [Archify](https://archify.si) **3.2.0**.
Each diagram answers one question. Open `index.html` for the overview. Every `.html` file is
standalone and works offline.

| Diagram | Type | Answers | Files |
| --- | --- | --- | --- |
| Runtime architecture | architecture | Which parts run where, and who talks to whom at runtime? | `runtime.architecture.json` / `.html` |
| Core data model | erd | Which tables hold groups, trainings and drinks, and how are they linked? | `data-model.erd.json` / `.html` |
| Login and session check | sequence | How does a member log in, and which layer checks the JWT? | `auth-login.sequence.json` / `.html` |
| Training RSVP and waitlist push | sequence | What happens on attend/decline, and how does the waitlist push go out? | `event-attendance.sequence.json` / `.html` |
| Drink booking and payment | sequence | How is a drink booked, billed and marked as paid? | `drinks-booking.sequence.json` / `.html` |

- `_evidence.md` lists the file and line range behind every node, participant and table.
- `receipts/` holds the passing `finalize` summary of each diagram (validate, deliver, check, browser-check).
- All sources are pinned to commit `eeb7254ae658af8c774487bc44e7c90ad12511cc`. After code changes, update
  `meta.repository.revision` and the cited line ranges before re-rendering.

## Re-render

Install the skill once (global, outside the repo):

```bash
npx -y skills@latest add https://archify.si --skill archify --agent claude-code --global --copy --yes
node ~/.claude/skills/archify/bin/archify.mjs doctor
```

Then, from the repository root, finalize the diagram you changed. The browser gate needs Chrome or
Chromium (set `ARCHIFY_CHROME` to its path if it is not found):

```bash
A=~/.claude/skills/archify/bin/archify.mjs
node $A finalize architecture docs/architecture/runtime.architecture.json docs/architecture/runtime.architecture.html --repo-root . --quality showcase --json
node $A finalize erd          docs/architecture/data-model.erd.json        docs/architecture/data-model.erd.html        --repo-root . --quality standard --json
for f in auth-login event-attendance drinks-booking; do
  node $A finalize sequence docs/architecture/$f.sequence.json docs/architecture/$f.sequence.html --repo-root . --quality showcase --json
done
```

`finalize` writes its receipts next to the HTML. Move the `*.finalize-summary.json` into `receipts/`
and delete the other receipt files, or keep them out of the commit.

The ERD columns come from the database, not from reading migrations by hand. Start the local stack
(`supabase start`), then read `information_schema.columns` and `pg_constraint` for the 13 tables.
