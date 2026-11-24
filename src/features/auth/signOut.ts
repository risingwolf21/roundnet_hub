import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';

/**
 * Logs the current user out resiliently.
 *
 * Uses `scope: 'local'` (logs out this device only — the expected behaviour for
 * a Logout button, and it avoids the global token-revocation round-trip). If the
 * upstream `/logout` endpoint is unavailable (e.g. a 502 "invalid response from
 * upstream server" from the auth gateway), supabase-js leaves the session in
 * place — so we fall back to clearing the persisted session and cached data
 * ourselves and reload, guaranteeing the user is signed out client-side either way.
 */
export async function signOut(): Promise<void> {
  await unbindPushSubscription();
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    // Success: onAuthStateChange('SIGNED_OUT') clears caches and routes to login.
  } catch (error: unknown) {
    captureException(error);
    forceLocalSignOut();
  }
}

/**
 * Stops pushes for the logged-out account reaching this device. Must run while still authenticated (RLS). The browser
 * subscription is kept, so the next login on this device re-registers it for that account.
 */
async function unbindPushSubscription(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    await supabase
      .schema('notifications')
      .from('web_push_subscriptions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('endpoint', subscription.endpoint)
      .throwOnError();
  } catch (error: unknown) {
    captureException(error);
  }
}

/**
 * Drops the persisted Supabase session and cached data, then reloads so the app
 * boots into the unauthenticated state. Used when the server-side logout fails.
 */
function forceLocalSignOut(): void {
  try {
    // Default supabase-js storage key is `sb-<project-ref>-auth-token`.
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch (storageError) {
    captureException(storageError);
  }
  queryClient.clear();
  window.location.assign('/');
}
