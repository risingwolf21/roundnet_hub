import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { formatDateToDatabase } from '@/utils';

export const fetchChallengeWithGroup = () =>
  supabase
    .from('challenge')
    .select('*, fullGroup: group(*, users: group_user_mapping ( user ( userId, email, displayName, avatarUrl ) ))');

export const ChallengeRepository = {
  async increasePointForUser(
    challenge: string,
    created_at: Date,
    image_url: string | null
  ): Promise<PostgrestSingleResponse<ChallengeStats>> {
    return supabase
      .rpc('increase_challenge_stats_count', {
        amount: 1,
        challenge_id: challenge,
        to_create_at: formatDateToDatabase(created_at)!,
        image_url: image_url ?? '',
      })
      .throwOnError();
  },
};
