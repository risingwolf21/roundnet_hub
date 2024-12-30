import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { AccountBox } from '@mui/icons-material';
import { formatDistanceToNowStrict } from 'date-fns';
import { de } from 'date-fns/locale';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FullComment } from '../../../types/supabaseTypes';
import { TFunction } from 'i18next';
import { useAuth } from '../../auth/AuthContext';

type Props = {
  showDivider?: boolean;
  reply: FullComment;
  t: TFunction;
  pl?: number;
};

export const CommentReplyText = ({ onClick }: { onClick: () => void }) => {
  const { user } = useAuth();
  return (
    <>
      <ListItem
        dense
        disablePadding
        key={'reply_text'}
        onClick={onClick}
        sx={{
          mt: 1,
          justifyContent: 'space-between',
          '&.MuiListItem-root': {
            paddingLeft: '56px',
          },
        }}
      >
        <ListItemAvatar sx={{ verticalAlign: 'top', display: 'flex' }}>
          <Avatar sx={{ borderRadius: 2 }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText primaryTypographyProps={{ color: 'rgba(0,0,0,0.54)' }} primary={'Schreibe eine Antwort'} />
      </ListItem>
      <Divider sx={{ ml: '56px', mt: 1 }} />
    </>
  );
};

export const CommentReplyItem = ({ reply, t, pl = 56 }: Props) => {
  const navigate = useNavigate();

  return (
    <ListItem
      dense
      disablePadding
      key={reply.id}
      sx={{
        justifyContent: 'space-between',
        '&.MuiListItem-root': {
          paddingLeft: `${pl}px`,
        },
      }}
    >
      <ListItemAvatar
        sx={{ verticalAlign: 'top', display: 'flex' }}
        onClick={(e) => {
          e.stopPropagation();
          navigate('/user/' + reply.user.userId);
        }}
      >
        <Avatar sx={{ borderRadius: 2 }}>
          {reply.pending ? (
            <CircularProgress size={'20px'} />
          ) : reply.user?.avatarUrl ? (
            <img src={reply.user?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
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
            {reply.displayName}
          </Typography>
          <Typography
            style={{
              fontSize: '10pt',
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            {t('events.information.commentTimeAgo', {
              time: formatDistanceToNowStrict(reply.created_at, { locale: de }),
            })}
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
          {reply.comment}
        </Typography>
      </Box>
    </ListItem>
  );
};
