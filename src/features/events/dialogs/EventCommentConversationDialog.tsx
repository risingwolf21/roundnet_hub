import { SwipeableDialog } from '../../../components/SwipeableDialog';
import React from 'react';
import { Box, IconButton, InputAdornment, List, TextField } from '@mui/material';
import { FullComment } from '../../../types/supabaseTypes';
import { CommentItem } from '../components/CommentItem';
import { TFunction } from 'i18next';
import { can } from '../../../utils/PermissionService';
import { Send } from '@mui/icons-material';

type Props = {
  comment: FullComment | null;
  title: string;
  setOpen?: (value: boolean) => void;
  onClose?: () => void;
  t: TFunction;
  eventInThePast: boolean;
};

export const EventCommentConversationDialog = ({ comment, title, setOpen, onClose, t, eventInThePast }: Props) => {
  return (
    <SwipeableDialog minHeight={90} open={comment !== null} title={title} setOpen={setOpen} onClose={onClose}>
      <Box sx={{ p: 2 }}>
        <List sx={{ width: '100%' }}>
          {comment && <CommentItem key={comment.id} comment={comment} t={t} replyToPressed={() => {}} />}
          {comment &&
            comment.replies.length > 0 &&
            comment.replies.map((x) => <CommentItem key={x.id} comment={x} t={t} replyToPressed={() => {}} />)}
        </List>
        <TextField
          disabled={eventInThePast || !can('insert', 'eventComments')}
          id="comment"
          name="comment"
          fullWidth
          placeholder="Write a comment..."
          sx={{ '& fieldset': { borderRadius: 4 }, '& input': { pt: 1.5, pb: 1.5 } }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" type="submit" disabled={eventInThePast || !can('insert', 'eventComments')}>
                    <Send />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </SwipeableDialog>
  );
};
