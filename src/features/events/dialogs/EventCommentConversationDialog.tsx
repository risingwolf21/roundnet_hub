import { SwipeableDialog } from '../../../components/SwipeableDialog';
import React, { createRef } from 'react';
import { Box, IconButton, InputAdornment, List, TextField } from '@mui/material';
import { FullComment } from '../../../types/supabaseTypes';
import { CommentItem } from '../components/CommentItem';
import { TFunction } from 'i18next';
import { can } from '../../../utils/PermissionService';
import { Send } from '@mui/icons-material';
import { CommentReplyItem } from '../components/CommentReplyItem';

type Props = {
  comment: FullComment | null;
  title: string;
  setOpen?: (value: boolean) => void;
  onClose?: () => void;
  t: TFunction;
  eventInThePast: boolean;
  handleCommentSubmit: (value: { comment: string; reply_to: string | null }) => void;
};

export const EventCommentConversationDialog = ({
  comment,
  title,
  setOpen,
  onClose,
  t,
  eventInThePast,
  handleCommentSubmit,
}: Props) => {
  const inputRef = createRef<HTMLInputElement>();

  const handleFocus = (e: any) => {
    e.preventDefault();
    setTimeout(() => {
      if (inputRef.current) {
        const element = inputRef.current;
        const rect = element.getBoundingClientRect(); // Position relativ zum Viewport
        const scrollTop = window.scrollY || document.documentElement.scrollTop;

        // Zielposition berechnen (z. B. mit einem kleinen Offset)
        const targetScroll = rect.top + scrollTop - 100; // 100px Puffer nach oben

        // Scrollen auslösen
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    }, 300);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const commentValue = data.get('comment')?.toString();
    if (!commentValue || !comment) return;

    handleCommentSubmit({ comment: commentValue, reply_to: comment.id });
    event.currentTarget.reset();
  };

  return (
    <SwipeableDialog minHeight={80} open={comment !== null} title={title} setOpen={setOpen} onClose={onClose}>
      <Box sx={{ p: 2, display: 'flex' }}>
        <List sx={{ width: '100%', flex: 1 }}>
          {comment && <CommentItem key={comment.id} comment={comment} t={t} replyToPressed={() => {}} />}
          {comment &&
            comment.replies.length > 0 &&
            comment.replies.map((x) => <CommentReplyItem key={x.id} pl={0} reply={x} t={t} />)}
        </List>
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1,
            background: 'white',
            pb: 'calc(8px + env(safe-area-inset-bottom))',
          }}
          component={'form'}
          onSubmit={submit}
        >
          <TextField
            ref={inputRef}
            disabled={eventInThePast || !can('insert', 'eventComments')}
            id="comment"
            name="comment"
            fullWidth
            placeholder="Write a comment..."
            sx={{ '& fieldset': { borderRadius: 4 }, '& input': { pt: 1.5, pb: 1.5 } }}
            onFocus={handleFocus}
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
      </Box>
    </SwipeableDialog>
  );
};
