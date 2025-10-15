import { supabase } from '@/lib/supabase';
import { formatDateToDatabase } from '@/utils';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

import InputBase from '@mui/material/InputBase';
import alpha from '@mui/material/alpha';
import styled from '@mui/material/styled';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Close from '@mui/icons-material/Close';

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
