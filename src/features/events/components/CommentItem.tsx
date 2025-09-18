import { AccountBox } from '@mui/icons-material';
import { Avatar, Box, Button, CircularProgress, ListItem, ListItemAvatar, Typography } from '@mui/material';
import { useDialogs } from '@toolpad/core';
import { TFunction } from 'i18next';
import React from 'react';
import { ProfileDialog } from '@/components/Profile';
import { useGrants } from '@/features/auth/GrantsContext';
import { FullComment } from '../../../types/supabaseTypes';

type Props = {
  comment: FullComment;
  t: TFunction;
  replyToPressed: () => void;
};

export const CommentItem = ({ comment, t, replyToPressed }: Props) => {
  const dialogs = useDialogs();
  const { user } = useGrants();
  return (
    <ListItem
      divider
      dense
      disablePadding
      key={comment.id}
      onClick={replyToPressed}
      sx={{
        justifyContent: 'space-between',
        '&.MuiListItem-root': {
          paddingLeft: 0,
        },
      }}
    >
      <ListItemAvatar
        sx={{ verticalAlign: 'top', display: 'flex' }}
        onClick={(e) => {
          e.stopPropagation();
          dialogs.open(ProfileDialog, { user, userId: comment.userId });
        }}
      >
        <Avatar sx={{ borderRadius: 2 }}>
          {comment.pending ? (
            <CircularProgress size={'20px'} />
          ) : comment.user?.avatarUrl ? (
            <img src={comment.user?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
          ) : (
            <AccountBox />
          )}
        </Avatar>
      </ListItemAvatar>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'start',
          alignContent: 'start',
          mt: '6px',
          mb: '6px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Typography
            style={{
              fontWeight: 'bold',
              fontSize: '10pt',
              color: 'rgba(0,0,0,0.8)',
            }}
          >
            {comment.displayName}
          </Typography>
          <Typography
            style={{
              fontSize: '10pt',
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            {t('format.distanceToNow', { date: new Date(comment.created_at) })}
          </Typography>
        </Box>
        <Typography
          sx={{
            margin: 0,
            fontFamily: '"Roboto", "Helvetica", "Arial"," sans-serif"',
            fontWeight: 400,
            fontSize: '0.875rem',
            lineHeight: '1.43',
            color: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          {comment.comment}
        </Typography>
        <Box
          sx={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Button
            sx={{ m: 0, borderRadius: 1, p: 0, justifyContent: 'start' }}
            onClick={replyToPressed}
            variant={'text'}
          >
            Reply to
          </Button>
        </Box>
      </Box>
    </ListItem>
  );
};
