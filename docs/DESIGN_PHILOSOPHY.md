# Design philosophy

How screens in this app are designed. Read this before building or changing any UI, and follow it so every screen feels like the same product. Reference implementations are listed at the end; open them and copy their structure rather than inventing a new one.

The app is a mobile-first PWA and Capacitor store app used by sports clubs. Most people use it one-handed on a phone, in a gym or at a bar, often casually. Admins use it too, but they use the same UI.

## Principles

1. **Say what it does, in the user's words.** Show the human description first and the technical key second in small mono text (`<code class="text-xs text-muted-foreground">`). Never show raw keys, enum values or database names alone. Take descriptions from the DB (`permissions.description`) or i18n.
2. **One screen, one job; group by topic.** A form or editor is a stack of cards, one per topic (Basics, Date and time, Location, …). A card has an icon chip and a short title. Do not use one long flat list or a wall of fields.
3. **Show the common case, hide the rest.** Optional settings are a labelled switch that reveals its controls only when on (`ToggleRow`). Switching on sets a sensible default, never `0` or empty. Rarely used things (e.g. "ends on another day") live behind such a switch.
4. **Prefer direct manipulation over dialogs about dialogs.** Choose from visible options (segmented buttons, steppers, switches) instead of an icon button that opens a picker. Use a modal only for search or selection of entities (group, user, place).
5. **The UI should be smart so the user does not have to be.** Derive and carry over values: moving the start time moves the end time, a meet-up defaults to 15 minutes before. Show the result ("Dauer: 2 h", "+3 / −1") instead of making people calculate.
6. **Always show the state of the whole.** Show totals, counts and summaries ("12 permissions · 3 features", "x/y active"), badges for things needing attention, and where a value is inherited from ("über Gruppe X"). The user should never have to open something to learn what it contains.
7. **Make danger obvious and separate.** Destructive actions live in their own "danger zone" box (`border-destructive/50 bg-destructive/10`, `TriangleAlert` icon, explanation, destructive button), never next to a harmless action. Always confirm.
8. **Don't make mistakes easy, don't punish them.** Validate inline next to the field (`FieldHint error`, `aria-invalid`) after the first submit attempt, not on every keystroke. Disable Save until something changed when editing a diff. Highlight unsaved changes (`bg-primary/5`). Still keep the server-side check and a toast for failures.
9. **Hub and spoke for admin.** Admin has one overview with a "Needs attention" list on top (counts, with badges that are repeated in the sidebar), then grouped tool lists. Do not add a sidebar entry per tool.
10. **Empty, loading and error states are part of the design.** Every list has an empty state with a hint on what to do next, a skeleton or spinner while loading, and a clear error toast with a retry path.

## Building blocks

Use the components in `src/components/ui` (shadcn-style) and the shared helpers; do not hand-roll replacements, and do not add a new UI library.

| Need | Use |
| --- | --- |
| Full-screen create/edit flow | `Dialog` with `variant="fullscreen"`, `DialogHeader variant="appbar"`, `DialogBody`, `DialogFooter variant="fullscreen"` |
| Small choice / confirm | `dialogs.confirm`, `dialogs.selectSingleOption`, `dialogs.selectGroup`, `dialogs.selectSingleUser` (from `useDialogs`) |
| Topic card | `FormSection` (`features/events/dialogs/EventFormParts.tsx`) |
| Optional setting | `ToggleRow` (same file) |
| Number with limits | `Stepper` (same file) |
| Inline help / error | `FieldHint` (same file) |
| Collapsible group with counts | `Collapsible` + `Badge` (`x/y`) + All/None buttons (see `GrantsEditorDialog`) |
| List item | `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions` |
| Status / count | `Badge` variants `default`, `secondary`, `info`, `success`, `warning`, `error`, `destructive` |
| Notices | `Alert` with variant `info` or `warning` |
| Pull to refresh | `PullToRefresh` |
| Feature/permission gating | `<Has perm=… feat=…>` and `useGrants()` |

If you need a pattern that more than one screen will use (e.g. a section card), put it in a shared file next to its first use, then move it to `src/components/ui` when a second feature needs it.

## Layout and spacing

- Mobile first. Design for a 360 px wide screen, then let it breathe on desktop. Use `grid-cols-2 sm:grid-cols-4`, not fixed widths.
- Screen background of forms is `bg-muted/30`; cards are `rounded-xl border bg-card p-4` with `gap-4` between fields and `gap-3` between cards.
- One column. Put two fields side by side only when they belong together and are short (From/Until, date/time).
- Touch targets are at least 40 px (`size="icon-lg"` for icon buttons, full-width buttons for primary actions). Primary action is one full-width button in the sticky footer.
- Respect the safe area: bottom-fixed elements use `env(safe-area-inset-bottom)` or `pb-safe-bottom`. Floating action buttons sit at `bottom: calc(1.5rem + env(safe-area-inset-bottom))`.
- Titles and descriptions inside `DialogHeader` must be stacked in their own `flex flex-col` wrapper; the default header is a row.
- Truncate long text (`truncate`, `min-w-0`) rather than letting it wrap and push buttons off screen.

## Colour, type and tone

- Only use theme tokens (`bg-card`, `text-muted-foreground`, `bg-primary/10`, `border-destructive`, …). No hard-coded hex colours; the two tenants (Karlsruhe, Munich) are themed through `src/theme/*`, and a screen must look right in both.
- Primary colour marks the one important thing on screen. Use `secondary` or `outline` for everything else.
- Type scale: section title `text-sm font-semibold`, row title `text-sm font-medium`, help text `text-xs text-muted-foreground`, keys in `<code>`. Avoid anything larger than the app bar title inside forms.
- Icons come from `lucide-react`, size 16 px in rows and chips. Icons support text; they never replace it for important actions. Icon-only buttons need an `aria-label`.
- Write labels as short noun phrases or verbs ("Ort auswählen", "Event erstellen"). Buttons say what will happen, not "OK" or "Submit". Use "Speichern" only when editing.
- Interaction feedback: toast on success and on failure (`sonner`), one toast per user action, never two.

## Internationalisation

- No user-visible string in code. Add keys to both `src/translation/locales/translation.de.json` and `translation.en.json`, grouped by feature (`events.creation.*`, `grants.*`).
- German is the primary language; write natural German, not word-for-word translations. Use plural keys (`_one`, `_other`) for counts.
- Format dates and times with `date-fns`; never build date strings by hand.

## Accessibility

- Every input has a visible label bound with `htmlFor`/`id` (a whole switch row may be a `<label>`).
- Segmented choices use `role="radiogroup"` with `role="radio"` and `aria-checked`.
- Errors are text, not colour alone, and use `aria-invalid` on the input.
- Don't disable zoom, and keep contrast of text on tokens as shipped.

## Behaviour rules for forms and editors

- Keep a single editable state object and a `patch()` helper; do not scatter many `useState`s.
- Editing flows compute a diff against the original and send only the changes (see `GrantsEditorDialog`'s `GroupResult`).
- Never lose input silently: closing a dirty editor should not save, and saving must be explicit.
- Data access stays in `src/repository/*` and `src/tanstack/*`. UI code never calls Supabase directly.
- Anything that depends on permissions or features is wrapped in `Has` and also enforced in the database (RLS or RPC). The UI is not the security boundary.

## Checklist before you finish a UI change

- [ ] Works at 360 px width and in both tenant themes.
- [ ] Every string is translated in de and en.
- [ ] Has empty, loading and error states.
- [ ] Optional settings are hidden behind a switch with good defaults.
- [ ] Destructive actions are separate, red and confirmed.
- [ ] Inline validation and one toast per action.
- [ ] Touch targets, labels and `aria-*` in place; no raw keys shown to users.
- [ ] I checked the screen at 320 px, with long text, with missing data and as a normal user (see "Robust to every state").
- [ ] `npx tsc --noEmit` and `npx eslint` show no new problems in the files you touched.

## List screens

- Use the shared pieces in `src/components/list/ListParts.tsx`: `SegmentedControl` for 2–3 views (instead of filter dialogs), `ListSectionHeader` with counts, `ListSkeleton` while loading, `ListError` with a retry button instead of an error toast.
- Rows are `Item`s with a coloured left edge (`sideBar`, see below), badges for state, and at most one primary action.
- State or colour on the left edge: always a 4 px left border on the `Item`/card itself, via `sideBar(tone)` (state: primary, info, success, warning, error, neutral) or `groupSideBar(color)` (a group's colour) from `ListParts.tsx`. Never draw a floating beam with `after:` on an inner element, so every list looks the same. Rows without a state use the `neutral` tone, not no edge, so text lines up.
- Show every user what they may see; show extra detail (declined counts, stock, hidden/private flags, open requests) only behind `Has perm=…`. RLS still decides the data; the UI only hides what would be noise.
- If an action is unavailable because of a missing permission, explain why instead of hiding it silently.
- Each list needs three states: loading, error, and an empty state that says what to do next.
- Event rows: a date tile (weekday, day, month in the group colour, like the event page header), then title (2 lines), time and location with their icons, and one optional hint line (full, answer deadline, answer opens, deadline passed). Lists still group events by day ("Today · Thursday, 5 June").
- The right side shows the attend/decline buttons **only while the user has not answered**. Once answered it shows the answer as a pill ("Dabei", "Nicht dabei", "Wartet", "Trainer"); changing it happens on the event page. Unanswered rows are then the only rows with buttons, so they stand out. The coloured bar on the left carries the answer.
- Group, attendee counts and admin details live on the event page, not in the row. The same row is used at every width; cap list pages at `max-w-5xl`.

## Detail screens

- Start with a hero card: the one fact that matters (date block, amount due, score, rank), the title, then badges for state. Actions come right below it.
- Primary action first, in context (join, attend, pay). Destructive actions (leave, delete) live in `src/components/DangerZone.tsx`, never next to normal actions.
- Gate by what the user may do, not only by role: edit and delete controls appear only with the matching permission or membership.
- Keep other people's private data (emails, last-seen) behind admin checks. Members see names and avatars only.
- Format money with `useCurrency()` and dates with `Intl.DateTimeFormat(i18n.resolvedLanguage, …)`; never hard-code `dd.MM.yyyy`.
- Track pending state per button (`mutation.variables`), not one shared spinner.
- Every screen needs a skeleton, an error state with retry, and a not-found state with a way back.

## Home and account

- The home page adapts to the user's grants, not to the tenant. Wrap each section in `Has feat=…` (and `perm=…`) and put data queries in the gated child component, so a missing feature never triggers a request.
- Lead with attention rows (unanswered events, unread notifications), then one primary "next" hero, then compact lists.
- Always finish with a quick-link grid gated per feature. Events-only tenants (Munich) must still get a complete, useful page.
- Show skeletons only on the first load; refresh through pull-to-refresh, not per-section buttons.
- Account starts with a profile hero, then card sections. Logout is neutral; deleting the account lives alone in `DangerZone`.
- Bulk destructive actions (clear all notifications) ask for confirmation via `dialogs.confirm`.

## Robust to every state

A screen is only done when it looks good both when everything is filled in and when it is not. Check each of these before you finish:

- **Narrow**: 320–360 px. Nothing leaves its card. Flex children that hold text need `min-w-0`; badges, buttons and checkmarks need `shrink-0`. Long names `truncate` or `line-clamp-2`, never push siblings out. `Item` already does this (`ItemContent` is `min-w-0`, `ItemActions` is `shrink-0`), so put text in `ItemContent` and controls in `ItemActions`.
- **Long**: a 60-character title, a location with a street and a city, a group name without spaces.
- **Missing**: no description, no location, no group, no avatar, no count, `null` dates. Skip the element (and its icon) instead of showing an empty line or "undefined"; show a muted placeholder only when the user needs to know the value is missing.
- **Many and few**: zero, one and a hundred rows. Zero rows get an empty state; counts and badges stay readable at 3 digits.
- **Roles**: the same row as a normal user and as an admin. Admin-only chips (counts, actions) must not change the layout of the normal user.
- **Tenants**: a tenant without drinks or items still gets a complete page.

## Pickers and people

- Entity pickers (`dialogs.selectGroup`, `selectSingleUser`) are full-screen dialogs: stacked title, always-visible search, rows that look like the list screens, the current choice highlighted with a check. Put the user's own memberships first ("My groups"), the rest below with a hint.
- Multi-select pickers (`selectMultipleUser`) show a checkbox per row (decorative, the row is the control), and one full-width footer button that shows the count ("Add 3 players") and is disabled until something is selected. E-mail addresses are private: show them only with `users.manage`.
- Long people lists are grouped by initial letter (`ListSectionHeader` with a count). Distinguish "nothing exists yet" (explain why, link to Groups) from "nothing matches" (offer to clear the search).
- A profile of another person shows only what they chose to share: honour `hide_rating` (index, RG index and ELO history are hidden for others, with a note), and show last activity only with `users.manage`.
- Profile layout: hero (avatar, name, badges), a row of stat tiles that only appear when they have data, then cards for head-to-head, history, Playerzone and trophies. Use `text-success` / `text-destructive` instead of hard-coded colours.

## Reference implementations

Open these before designing something similar.

- Detail screens: `EventInformation/index.tsx`, `PublicGroupInformation.tsx`, `MatchInformation.tsx`, `Leaderboard.tsx`, `HistoryScreen.tsx`, `PayDrinksScreen.tsx`, `ChallengeInformation.tsx`.
- Home: `src/features/homepage/HomePage.tsx`. Account: `src/features/profile/User.tsx`. Grouped feed: `NotificationScreen.tsx`.
- Pickers and profiles: `src/components/dialogs/SearchAndSelectGroupDialog.tsx`, `SearchAndSelectUsersDialog.tsx`, `src/features/search/UserSearchPage.tsx`, `src/components/ProfileDialog.tsx`.

- Create/edit form: `src/features/events/dialogs/CreateOrUpdateEventDialog.tsx` with `EventFormParts.tsx`.
- Master–detail editor with groups, counts, search and inherited values: `src/features/grants/GrantsManager.tsx`, `GrantsEditorDialog.tsx`.
- Hub with "Needs attention" and grouped tools: `src/features/admin/AdminDashboard.tsx`.
- Danger zone: `src/features/profile/tabs/AccountTab.tsx`.
- Blocking consent dialog with stacked header: `src/features/legal/TermsGate.tsx`.
- Lists: `EventList.tsx`/`EventItem.tsx`, `DrinkListScreen.tsx`, `PublicGroupList.tsx`, `GameList.tsx`, `ChallengeList.tsx`.
