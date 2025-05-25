import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { Dayjs } from 'dayjs';
import { supabase } from '../components/services/supabase/supabaseClient';
import { ChallengeStatWithUser, FullChallenge } from '../types/supabaseTypes';
import { dayjsToDb, formatDateToDatabase } from '../utils';

export const fetchChallengeWithGroup = () => supabase
  .from('challenge')
  .select('*, fullGroup: group(*, users: group_user_mapping ( user ( userId, email, displayName, avatarUrl ) ))');


export const ChallengeRepository = {
  async fetchChallenges() {
    const { data, error } = await fetchChallengeWithGroup()
      .or(`end_date.is.null,end_date.gt.'${formatDateToDatabase(new Date())}'`)
      .order('name')
      .returns<ChallengeWithFullGroup[]>();

    if (error) throw error;

    return data ?? [];
  },

  async fetchChallengeStats(challenge_id?: string): Promise<FullChallenge | null> {
    if (!challenge_id) {
      return null;
    }
    const { data } = await supabase
      .from('challenge')
      .select('*, group: group(*, users: group_user_mapping ( user ( userId, email, displayName ) )), stats: challenge_stats (*, fullUser: user(*))')
      .eq('id', challenge_id)
      .throwOnError()
      .returns<FullChallenge>()
      .single();

    return data;
  },

  async increasePointForUser(userId: string, challenge: string, created_at: Dayjs, image_url: string | null): Promise<PostgrestSingleResponse<ChallengeStats>> {
    return supabase
      .rpc('increase_challenge_stats_count', { user_id: userId, amount: 1, challenge_id: challenge, to_create_at: dayjsToDb(created_at)!, image_url: image_url ?? "" })
      .throwOnError();
  }
};
