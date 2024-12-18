import { Send } from '@mui/icons-material';
import { Box, IconButton, InputAdornment, List, TextField, Typography } from '@mui/material';
import React, { createRef, useEffect, useState } from 'react';
import { FullComment } from 'src/types/supabaseTypes';
import { useAppDispatch } from 'src/redux/store';
import { useClient } from 'react-supabase';
import {
  onEventCommentDelete,
  onEventCommentInsert,
  onEventCommentUpdate,
} from 'src/features/events/slices/eventCommentsSlice';
import { SupabaseEventRepository } from '../../../repository/EventRepository';
import { useTranslation } from 'react-i18next';
import { can } from '../../../utils/PermissionService';
import { CommentReplyItem, CommentReplyText } from './CommentReplyItem';
import { CommentItem } from './CommentItem';
import { EventCommentConversationDialog } from '../dialogs/EventCommentConversationDialog';

type EventInformationCommentsProps = {
  comments: FullComment[];
  handleCommentSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  eventId: string;
  eventInThePast: boolean;
};

const EventInformationComments = ({
  comments,
  handleCommentSubmit,
  eventId,
  eventInThePast,
}: EventInformationCommentsProps) => {
  const { t } = useTranslation();
  const client = useClient();
  const dispatch = useAppDispatch();
  const inputRef = createRef<HTMLInputElement>();
  const [replyDialogOpen, setReplyDialogOpen] = useState<FullComment | null>(null);

  useEffect(() => {
    let subscription = client
      .channel('public:event_comments')
      .on<EventCommentUpdate>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_comments',
          filter: `event=eq.${eventId}`,
        },
        (payload) => dispatch(onEventCommentUpdate(payload.new))
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'event_comments',
          filter: `event=eq.${eventId}`,
        },
        (payload) => dispatch(onEventCommentDelete(payload.old.id))
      )
      .on<EventCommentInsert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `event=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new.id)
            SupabaseEventRepository.fetchSingleComment(payload.new.id).then((result) => {
              if (result.data) dispatch(onEventCommentInsert(result.data));
            });
        }
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [client, dispatch, eventId]);

  const handleFocus = () => {
    document.body.style.paddingBottom = '300px';
    setTimeout(() => {
      if (inputRef.current) {
        const yOffset = inputRef.current.getBoundingClientRect().top + window.scrollY - 50; // 50px Puffer
        window.scrollTo({ top: yOffset, behavior: 'smooth' });
      }
    }, 300);
  };

  const handleBlur = () => {
    document.body.style.paddingBottom = '0px'; // Padding zurücksetzen
  };

  return (
    <Box sx={{ p: 0, pb: 2, alignSelf: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
        Kommentare
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <List sx={{ mb: 4 }}>
          {comments &&
            comments.map((x, index) => (
              <>
                <CommentItem comment={x} t={t} replyToPressed={() => setReplyDialogOpen(x)} />
                {x.replies.length > 0 && (
                  <>
                    {x.replies.map((reply, index) => (
                      <CommentReplyItem reply={reply} t={t} />
                    ))}
                    <CommentReplyText onClick={() => setReplyDialogOpen(x)} />
                  </>
                )}
              </>
            ))}
        </List>
        <Box component={'form'} onSubmit={handleCommentSubmit}>
          <TextField
            ref={inputRef}
            disabled={eventInThePast || !can('insert', 'eventComments')}
            id="comment"
            name="comment"
            fullWidth
            placeholder="Write a comment..."
            sx={{ '& fieldset': { borderRadius: 4 }, '& input': { pt: 1.5, pb: 1.5 } }}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
        <EventCommentConversationDialog
          comment={replyDialogOpen}
          title={'Antworten'}
          t={t}
          onClose={() => setReplyDialogOpen(null)}
        />
      </Box>
    </Box>
  );
};

export default EventInformationComments;
