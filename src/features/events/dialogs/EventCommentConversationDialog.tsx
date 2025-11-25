import { TFunction } from 'i18next';
import React, { useRef } from 'react';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { FullComment } from '../../../types/supabaseTypes';
import { CommentItem } from '../components/CommentItem';
import { CommentReplyItem } from '../components/CommentReplyItem';

import Send from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';

type Props = {
  comment: FullComment | null;
  title: string;
  setOpen?: (value: boolean) => void;
  onClose?: () => void;
  t: TFunction;
  eventInThePast: boolean;
  handleCommentSubmit: (value: { comment: string; reply_to: FullComment | null }) => void;
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
  const inputRef = useRef<HTMLInputElement>(null);

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

    handleCommentSubmit({ comment: commentValue, reply_to: comment });
    event.currentTarget.reset();
  };

  return (
    <SwipeableDialog minHeight={80} open={comment !== null} title={title} setOpen={setOpen} onClose={onClose}>
      <Box sx={{ p: 2, pb: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <List sx={{ width: '100%' }}>
            {comment && <CommentItem key={comment.id} comment={comment} t={t} replyToPressed={() => {}} />}
            {comment &&
              comment.replies &&
              comment.replies.length > 0 &&
              comment.replies.map((x) => <CommentReplyItem key={x.id} pl={0} reply={x} t={t} />)}
          </List>
        </Box>
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            flex: 'auto',
            background: 'white',
          }}
          component={'form'}
          onSubmit={submit}
        >
          <TextField
            ref={inputRef}
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
                    <IconButton edge="end" type="submit">
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
