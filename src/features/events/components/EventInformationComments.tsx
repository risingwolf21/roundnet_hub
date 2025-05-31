import { Send } from '@mui/icons-material';
import { Box, IconButton, InputAdornment, List, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import React, { createRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthentication } from 'src/features/auth/AuthContext';
import { SupabaseEventRepository } from 'src/repository/EventRepository';
import { FullComment } from 'src/types/supabaseTypes';
import { can } from '../../../utils/PermissionService';
import { EventCommentConversationDialog } from '../dialogs/EventCommentConversationDialog';
import { CommentItem } from './CommentItem';
import { CommentReplyItem, CommentReplyText } from './CommentReplyItem';
import { useAddCommentMutation } from 'src/tanstack/events';

type EventInformationCommentsProps = {
  eventId: string;
  eventInThePast: boolean;
};

const EventInformationComments = ({
  eventId,
  eventInThePast,
}: EventInformationCommentsProps) => {

  const { user } = useAuthentication();
  const { t } = useTranslation();
  const inputRef = createRef<HTMLInputElement>();
  const [replyDialogOpen, setReplyDialogOpen] = useState<FullComment | null>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ["events", eventId, "comments"],
    queryFn: () => SupabaseEventRepository.fetchEventComments(eventId)
  });

  const addCommentMutation = useAddCommentMutation(user);

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
    if (!commentValue) return;

    addCommentMutation.mutate({ eventId, comment: commentValue, reply_to: null });
    event.currentTarget.reset();
  };

  return (
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
        Kommentare
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <List>
          {comments &&
            comments.map((x, index) => (
              <>
                <CommentItem comment={x} t={t} replyToPressed={() => setReplyDialogOpen(x)} />
                {x.replies && x.replies.length > 0 && (
                  <>
                    {x.replies
                      .filter((x) => x)
                      .map((reply, index) => (
                        <CommentReplyItem reply={reply} t={t} />
                      ))}
                    <CommentReplyText onClick={() => setReplyDialogOpen(x)} />
                  </>
                )}
              </>
            ))}
        </List>
        <Box component={'form'} onSubmit={submit}>
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
        <EventCommentConversationDialog
          comment={replyDialogOpen}
          title={'Antworten'}
          t={t}
          onClose={() => setReplyDialogOpen(null)}
          eventInThePast={eventInThePast}
          handleCommentSubmit={({ comment, reply_to }) => {
            addCommentMutation.mutate({ eventId, comment, reply_to });
            setReplyDialogOpen(null);
          }}
        />
      </Box>
    </Box>
  );
};

export default EventInformationComments;
