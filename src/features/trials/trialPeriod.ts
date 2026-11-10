// Mirrors the server-side `trial_duration_days` (app_config, default 28). Used only for the
// informational countdown; the authoritative expiry runs in the DB cron job.
export const TRIAL_DURATION_DAYS = 28;

export const trialDaysLeft = (startedAt: string | null | undefined, now: number): number | null => {
  if (!startedAt) return null;
  const elapsedDays = Math.floor((now - new Date(startedAt).getTime()) / 86_400_000);
  return TRIAL_DURATION_DAYS - elapsedDays;
};
