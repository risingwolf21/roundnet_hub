import { supabase } from '@/lib/supabase';
import { TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { ChallengePointsView } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

export const fetchChallengeWithGroup = () =>
  supabase
    .from('challenge')
    .select('*, fullGroup: group(*, users: group_user_mapping ( user ( id, email, displayName, avatarUrl ) ))');

export const ChallengeRepository = {
  async fetchInfiniteChallengeStats(challengeId: string, count: number, pageParam: number) {
    const { data } = await supabase
      .schema('public')
      .from('challenge_stats')
      .select('*, fullUser: user(*), meta: challenge_stats_meta(*)')
      .eq('challenge', challengeId)
      .range(pageParam * count, pageParam * count + count - 1)
      .order('created_at', { ascending: false })
      .throwOnError();
    const hasMore = (data?.length ?? 0) === count;
    return { data: data ?? [], nextPage: hasMore ? pageParam + 1 : undefined };
  },

  async fetchLeaderboard(challengeId: string): Promise<ChallengePointsView[]> {
    const result = await supabase
      .from('challenge_user_points')
      .select('*')
      .eq('challenge', challengeId)
      .returns<ChallengePointsView[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchChallenge(challengeId: string): Promise<Challenge | null> {
    const result = await supabase.from('challenge').select('*').eq('id', challengeId).maybeSingle().throwOnError();
    return result.data;
  },

  async fetchActiveChallenges(): Promise<Challenge[]> {
    const { data } = await supabase
      .from('challenge')
      .select('*')
      .or(`end_date.is.null,end_date.gt.'${formatDateToDatabase(new Date())}'`)
      .order('name')
      .throwOnError();
    return data ?? [];
  },

  async fetchPodiums() {
    const { data } = await supabase
      .from('challenge_podium')
      .select('*')
      .order('end_date', { ascending: false })
      .throwOnError();
    return (data ?? []).map((podium) => ({
      ...podium,
      podium: podium.podium as unknown as { user_id: string; name: string; score: number; rank: number; image_url: string }[],
    }));
  },

  async fetchArchivedChallenges(pageParam: number, count: number = 20) {
    const { data } = await supabase
      .from('challenge')
      .select('*')
      .not('end_date', 'is', null)
      .lt('end_date', formatDateToDatabase(new Date()))
      .order('end_date', { ascending: false })
      .range(pageParam * count, pageParam * count + count - 1)
      .throwOnError();
    const hasMore = (data?.length ?? 0) === count;
    return { data: data ?? [], nextPage: hasMore ? pageParam + 1 : undefined };
  },

  async fetchStatsForUser(challengeId: string, userId: string): Promise<ChallengeStats[]> {
    const result = await supabase
      .from('challenge_stats')
      .select('*')
      .eq('challenge', challengeId)
      .eq('user', userId)
      .throwOnError();
    return result.data ?? [];
  },

  async uploadImage(challengeId: string, fileName: string, file: File | Blob) {
    return supabase.storage.from('challenge').upload(`${challengeId}/${fileName}`, file, { upsert: true });
  },

  getImageUrl(path: string): string | null {
    const { data } = supabase.storage.from('challenge').getPublicUrl(path);
    return data?.publicUrl ?? null;
  },

  async increasePointForUser(params: {
    challenge: string;
    created_at: Date;
    image_url: string | null;
    amount: number;
    category?: string;
    comment?: string;
  }): Promise<PostgrestSingleResponse<ChallengeStats>> {
    return supabase
      .rpc('increase_challenge_stats_count', {
        amount: params.amount,
        challenge_id: params.challenge,
        to_create_at: formatDateToDatabase(params.created_at)!,
        image_url: params.image_url ?? '',
        category: params.category,
        comment: params.comment,
      })
      .throwOnError();
  },

  async updateChallenge(update: TablesUpdate<'challenge'>) {
    const sanitized: TablesUpdate<'challenge'> = {
      ...update,
      ...(update.category_options !== undefined && {
        category_options: Array.isArray(update.category_options) ? update.category_options : null,
      }),
    };
    const result = await supabase
      .from('challenge')
      .update(sanitized)
      .eq('id', sanitized.id ?? '')
      .throwOnError();
    return result.data;
  },

  async insertChallenge(challenge: TablesInsert<'challenge'>) {
    const result = await supabase
      .from('challenge')
      .insert({
        automated: challenge.automated,
        name: challenge.name,
        description: challenge.description,
        end_date: challenge.end_date,
        max_points_per_day: challenge.max_points_per_day,
        max_points_per_week: challenge.max_points_per_week,
        group: challenge.group,
        comments_enabled: challenge.comments_enabled,
        category_enabled: challenge.category_enabled,
        category_options: challenge.category_options,
        show_all_members: challenge.show_all_members,
      })
      .select('*')
      .single()
      .throwOnError();
    return result.data;
  },
};
