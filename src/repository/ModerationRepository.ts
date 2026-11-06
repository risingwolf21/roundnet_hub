import { supabase } from '@/lib/supabase';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export const REPORT_REASONS: ReportReason[] = ['harassment', 'inappropriate', 'spam', 'other'];

export const CURRENT_TERMS_VERSION = '2026-11';

export const ModerationRepository = {
  async reportComment(userId: string, commentId: string, reason: ReportReason, details?: string) {
    await supabase
      .from('content_reports')
      .insert({ reporter: userId, comment_id: commentId, reason, details: details?.trim() || null })
      .throwOnError();
  },

  async fetchMyReportedCommentIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('content_reports')
      .select('comment_id')
      .eq('reporter', userId)
      .throwOnError();
    return (data ?? []).map((x) => x.comment_id).filter((x): x is string => !!x);
  },

  async blockUser(blocker: string, blocked: string) {
    await supabase.from('user_blocks').insert({ blocker, blocked }).throwOnError();
  },

  async unblockUser(blocker: string, blocked: string) {
    await supabase.from('user_blocks').delete().eq('blocker', blocker).eq('blocked', blocked).throwOnError();
  },

  async fetchBlockedUsers(blocker: string) {
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked, created_at, user:blocked(id, displayName, avatarUrl)')
      .eq('blocker', blocker)
      .order('created_at', { ascending: false })
      .throwOnError();
    return (data ?? []) as unknown as {
      blocked: string;
      created_at: string;
      user: { id: string; displayName: string | null; avatarUrl: string | null } | null;
    }[];
  },

  async fetchOpenReports() {
    const { data } = await supabase
      .from('content_reports')
      .select('id, created_at, reason, details, comment_text, comment_id, reported_user, reporter')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .throwOnError();
    return data ?? [];
  },

  async moderateReport(reportId: string, action: 'dismiss' | 'remove') {
    await supabase.rpc('moderate_report', { p_report: reportId, p_action: action }).throwOnError();
  },

  async acceptTerms(userId: string) {
    await supabase
      .from('user')
      .update({ terms_accepted_at: new Date().toISOString(), terms_version: CURRENT_TERMS_VERSION })
      .eq('id', userId)
      .throwOnError();
  },
};
