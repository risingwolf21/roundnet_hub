import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { Dayjs } from 'dayjs';
import { supabase } from '../components/services/supabase/supabaseClient';
import { ChallengeStatWithUser, FullChallenge } from '../types/supabaseTypes';
import { dayjsToDb, formatDateToDatabase } from '../utils';

export const fetchChallengeWithGroup = () => supabase
  .from('challenge')
  .select('*, fullGroup: group(*, users: group_user_mapping ( user ( userId, email, displayName, avatarUrl ) ))');


export const ChallengeRepository = {
  async fetchChallenges(): Promise<PostgrestSingleResponse<ChallengeWithFullGroup[]>> {
    return fetchChallengeWithGroup()
      .or(`end_date.is.null,end_date.gt.'${formatDateToDatabase(new Date())}'`)
      .order('name')
      .throwOnError()
      .returns<ChallengeWithFullGroup[]>();
  },

  async fetchArchivedChallenges(): Promise<PostgrestSingleResponse<Challenge[]>> {
    return supabase
      .from('challenge')
      .select('*')
      .not('end_date', 'is', null)
      .lt('end_date', formatDateToDatabase(new Date()))
      .order('end_date')
      .throwOnError()
      .returns<Challenge[]>();
  },

  async fetchChallengeStats(id: number): Promise<PostgrestSingleResponse<FullChallenge>> {
    return supabase
      .from('challenge')
      .select('*, group: group(*, users: group_user_mapping ( user ( userId, email, displayName ) )), stats: challenge_stats (*, fullUser: user(*))')
      .eq('id', id)
      .throwOnError()
      .returns<FullChallenge>()
      .single();
  },

  async fetchChallengeStatsSingle(
    challenge_id: number,
    user_id: string
  ): Promise<PostgrestSingleResponse<ChallengeStatWithUser>> {
    return supabase
      .from('challenge_stats')
      .select('*, fullUser: user(*)')
      .eq('challenge', challenge_id)
      .eq('fullUser.userId', user_id)
      .throwOnError()
      .returns<ChallengeStatWithUser>()
      .single();
  },

  async increasePointForUser(userId: string, challenge: number, created_at: Dayjs, image_url: string | null): Promise<PostgrestSingleResponse<ChallengeStats>> {
    return supabase
      .rpc('increase_challenge_stats_count', { user_id: userId, amount: 1, challenge_id: challenge, to_create_at: dayjsToDb(created_at), image_url: image_url ?? "" })
      .throwOnError();
  }
};
