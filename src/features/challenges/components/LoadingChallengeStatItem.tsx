import { Avatar, ListItem, ListItemAvatar, ListItemText, Skeleton, Typography } from '@mui/material';
import React from 'react';

const medalForPlace = (index: number) => {
  if (index === 0) return '🥇';
  else if (index === 1) return '🥈';
  else if (index === 2) return '🥉';
  else return (index + 1).toString();
};

export const LoadingChallengeStatItem = ({ index }: { index: number }) => {
  return (
    <ListItem divider secondaryAction={<Skeleton width={'24px'} height={'25px'} variant="text" />}>
      <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center', mr: 2 }}>
        <Avatar sx={{ borderRadius: 2, backgroundColor: 'transparent', width: '50px', height: '50px' }}>
          <Typography
            sx={{
              fontSize: index < 3 ? '22pt' : '18pt',
              fontWeight: 'bold',
              color: 'black',
              mr: 1,
            }}
          >
            {medalForPlace(index)}
          </Typography>
        </Avatar>
        <Skeleton width={50} height={50} variant="rectangular" sx={{ borderRadius: 2 }} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{ fontWeight: 'bold' }}
        primary={<Skeleton width={'75px'} height="100%" variant="text" />}
      />
    </ListItem>
  );
};
