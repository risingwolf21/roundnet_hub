import { supabase } from '@/lib/supabase';

export type TrialInviteInfo = { group_id: string; group_name: string; event_limit: number; expires_at: string | null; valid: boolean };
export type TrialStatus = { event_limit: number | null; events_used: number; is_guest: boolean; trial_started_at: string | null };
export type TrialInvite = {
  id: string;
  group: string;
  token: string;
  event_limit: number;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
  created_at: string;
};
export type NewTrialInvite = Pick<TrialInvite, 'group' | 'event_limit' | 'expires_at' | 'max_uses'>;

/** The address of the page a guest opens to start a trial. */
export const trialInviteUrl = (token: string) => `${window.location.origin}/probe/${token}`;

export const TrialRepository = {
  /** Readable before anyone signs in: which group a link belongs to and whether it still works. */
  async fetchInviteInfo(token: string): Promise<TrialInviteInfo | null> {
    const { data } = await supabase.rpc('trial_invite_info', { p_token: token }).throwOnError();
    return data?.[0] ?? null;
  },

  async signInAsGuest(name: string, language: string) {
    const { error } = await supabase.auth.signInAnonymously({ options: { data: { name, displayName: name, language } } });
    if (error) throw error;
  },

  /** Makes the signed-in person a trial member of the link's group; returns the group id. */
  async redeemInvite(token: string, name?: string): Promise<string> {
    const { data } = await supabase.rpc('redeem_trial_invite', { p_token: token, p_name: name }).throwOnError();
    return data as string;
  },

  async fetchStatus(groupId: string, userId?: string): Promise<TrialStatus | null> {
    const { data } = await supabase.rpc('trial_status', { p_group: groupId, p_user: userId }).throwOnError();
    return data?.[0] ?? null;
  },

  async fetchInvites(groupId: string): Promise<TrialInvite[]> {
    const { data } = await supabase
      .from('trial_invites')
      .select('*')
      .eq('group', groupId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .throwOnError();
    return data ?? [];
  },

  async createInvite(invite: NewTrialInvite): Promise<TrialInvite> {
    const { data } = await supabase.from('trial_invites').insert(invite).select('*').single().throwOnError();
    return data;
  },

  async deactivateInvite(id: string) {
    await supabase.from('trial_invites').update({ active: false }).eq('id', id).throwOnError();
  },

  /** null = the trial only ends after the trial period. */
  async setEventLimit(groupId: string, userId: string, limit: number | null) {
    await supabase
      .from('group_user_mapping')
      .update({ trial_event_limit: limit })
      .eq('group', groupId)
      .eq('user', userId)
      .throwOnError();
  },

  /** A guest links an e-mail address; the confirmation link leads to setting a password. */
  async linkEmail(email: string) {
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${(import.meta.env.VITE_PUBLIC_URL ?? window.location.origin).replace(/\/$/, '')}/auth/reset-password` }
    );
    if (error) throw error;
  },
};
