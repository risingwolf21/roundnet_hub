import { t } from 'i18next';

/** The database refuses a trial member's sign-up with these hints (20261109150000_guest_trials). */
const TRIAL_HINTS: Record<string, string> = {
  trial_event_limit_reached: 'trials.errors.limitReached',
  trial_event_closed: 'trials.errors.eventClosed',
};

/** A readable message when a trial member's sign-up was refused on purpose, else null. */
export const trialAttendanceError = (error: unknown): string | null => {
  const hint = typeof error === 'object' && error !== null && 'hint' in error ? String((error as { hint: unknown }).hint) : '';
  const key = TRIAL_HINTS[hint];
  return key ? t(key) : null;
};
