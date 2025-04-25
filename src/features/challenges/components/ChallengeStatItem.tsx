import { AccountBox } from '@mui/icons-material';
import { Avatar, Card, CardActionArea, CardContent, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import React from 'react';
import { ChallengeStatWithUser } from '../../../types/supabaseTypes';

const medalForPlace = (index: number) => {
  if (index === 0) return '🥇';
  else if (index === 1) return '🥈';
  else if (index === 2) return '🥉';
  else return (index + 1).toString();
};

export const ChallengeStatItem = ({
  statsForUser,
  index,
}: {
  statsForUser: ChallengeStatWithUser[];
  index: number;
}) => {

  const user = statsForUser[0]?.fullUser

  if (!user)
    return null

  return <Card sx={{ m: 1, p: 0 }} elevation={3} key={user.userId}>
    <CardContent>
      <ListItem
        sx={{ p: 0 }}
        secondaryAction={<Typography>{statsForUser.reduce((p, c) => p + c.count, 0)}</Typography>}
      >
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center', mr: 2 }}>
          <Avatar sx={{ borderRadius: 2, backgroundColor: 'transparent', width: "50px", height: "50px" }}>
            <Typography
              sx={{
                fontSize: index < 3 ? '22pt' : '18pt',
                fontWeight: 'bold',
                color: 'black',
                mr: 1
              }}
            >
              {medalForPlace(index)}
            </Typography>
          </Avatar>
          <Avatar sx={{ borderRadius: 2, width: "50px", height: "50px" }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
            ) : (
              <AccountBox />
            )}
          </Avatar>
        </ListItemAvatar>
        <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={user.displayName} />
      </ListItem>
    </CardContent>
  </Card>
};
