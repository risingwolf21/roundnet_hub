import type { TrialStatus } from '@/repository/TrialRepository';
import type { EventsUserView } from '@/types/supabaseTypes';

const COUNTED: EventAttendance[] = ['AttendingAsTrial', 'WaitingAsTrial'];
const SIGN_UP: EventAttendance[] = ['Attending', 'Waiting', 'AttendingAsTrial', 'WaitingAsTrial'];

/**
 * How a trial member's answer changes the trainings they have used (mirrors trial_events_used in the
 * database): signing up (attending or waiting) uses one, leaving a sign-up gives it back, moving
 * between attending and waiting changes nothing. Cancelled events never count.
 */
export const trialUsageDelta = (
  event: Pick<EventsUserView, 'user_state' | 'user_group_role' | 'isCancelled'>,
  newState: EventAttendance
): number => {
  if (event.user_group_role !== 'trial' || event.isCancelled) return 0;
  const before = !!event.user_state && COUNTED.includes(event.user_state) ? 1 : 0;
  const after = SIGN_UP.includes(newState) ? 1 : 0;
  return after - before;
};

/** The trial status with the answer applied, for an immediate update of "Noch x von y". */
export const applyTrialUsage = (status: TrialStatus, delta: number): TrialStatus => ({
  ...status,
  events_used: Math.max(0, status.events_used + delta),
});
