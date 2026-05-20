import { UserEdited } from '@/features/admin/dialogs/EditUserDialog';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase-generated.types';
import { FullPayment, UserWithGroups } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { Database } from '@/types/supabase-generated.types';

export type RpcName = keyof Database['public']['Functions'];

export const fetchGroupWithUsers = () =>
  supabase.from('event_group').select('*, mapping: group_user_mapping ( user: user(*), group, role )');

export const AdminUsersRepository = {
  async removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
    return supabase
      .from('group_user_mapping')
      .delete()
      .eq('group', group.id)
      .in(
        'user',
        users.map((x) => x.id)
      )
      .throwOnError();
  },

  async fetchSingleGroupWithUsers(groupId: string): Promise<PostgrestSingleResponse<GroupWithUsers>> {
    return fetchGroupWithUsers().eq('id', groupId).single().throwOnError();
  },

  async deactivateUser(user: User): Promise<void> {
    await supabase.from('payments').update({ paymentState: 'Fulfilled' }).eq('user', user.id);
    await supabase.from('user').update({ verified: false }).eq('id', user.id);
  },

  async updateUser(user: UserEdited): Promise<User | null> {
    const result = await supabase
      .from('user')
      .update({ displayName: user.displayName, verified: user.verified })
      .eq('id', user.userId)
      .select('*')
      .single();
    return result.data ?? null;
  },

  async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
    return supabase.from('user').select('*').eq('verified', false).returns<User[]>().throwOnError();
  },

  async fetchAllUsersWithGroups(): Promise<UserWithGroups[]> {
    const result = await supabase
      .from('user')
      .select('*, groups: group_user_mapping ( group: event_group ( * ))')
      .order('displayName', { ascending: true })
      .throwOnError();

    return (
      result.data?.map((x) => ({
        ...x,
        groups: x.groups.map((x: any) => x.group) ?? [],
      })) ?? []
    );
  },

  async addUsersToGroup(group: Group, users: User[]): Promise<Tables<'group_user_mapping'>[]> {
    const result = await supabase
      .from('group_user_mapping')
      .upsert(
        users.map((x) => {
          return {
            user: x.id,
            group: group.id,
          };
        })
      )
      .select('*')
      .throwOnError();
    return result.data ?? [];
  },

  async fetchUnlinkedPlayers() {
    const result = await supabase.schema('games').from('players').select('*').is('linked_user_id', null);
    if (result.error) throw result.error;
    return result.data ?? [];
  },

  async fetchOpenPayments(): Promise<FullPayment[]> {
    const response = await supabase
      .from('payments')
      .select('id, created_at, paymentState, amountToPay, userId: user, user (id, displayName, name, email), history (*)')
      .eq('paymentState', 'Open' as PaymentState)
      .order('displayName', { referencedTable: 'user', ascending: true })
      .returns<FullPayment[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  },

  async confirmPayment(userId: string) {
    const result = await supabase
      .from('payments')
      .update({ paymentState: 'Fulfilled' as PaymentState })
      .eq('user', userId)
      .eq('paymentState', 'Open' as PaymentState)
      .select('*')
      .single();
    return result.data;
  },

  async runAnalytics(rpc: RpcName, params: Record<string, any>) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const { data, error } = await supabase.rpc(rpc as any, cleanParams as any);
    if (error) throw error;
    return data as any[];
  },

  async fetchTableOptions(table: string, labelField: string = 'name') {
    const { data, error } = await supabase.from(table as any).select(`id, ${labelField}`).limit(100);
    if (error) throw error;
    return (data as any) || [];
  },

  async notifyEmit(args: {
    recipients: string[];
    topic: string;
    title: string;
    body: string;
    urgency: string;
    scopeType: string;
    scopeId: string;
    sourceId: string;
  }): Promise<number> {
    const { data, error } = await supabase.rpc('notify_emit', {
      p_recipients: args.recipients,
      p_topic: args.topic,
      p_title: args.title,
      p_body: args.body,
      p_data: {},
      p_source_type: 'admin',
      p_source_id: args.sourceId,
      p_urgency: args.urgency,
      p_scope_type: args.scopeType,
      p_scope_id: args.scopeId,
    });
    if (error) throw error;
    return (data ?? 0) as number;
  },
};
