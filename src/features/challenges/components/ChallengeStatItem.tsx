import { AccountBox } from '@mui/icons-material';
import { Avatar, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';

const medalForPlace = (index: number) => {
  if (index === 0) return '🥇';
  else if (index === 1) return '🥈';
  else if (index === 2) return '🥉';
  else return (index + 1).toString();
};

export const ChallengeStatItem = ({
  points,
  displayName,
  avatarUrl,
  index,
}: {
  displayName: string;
  avatarUrl: string | null;
  points: number;
  index: number;
}) => {
  return (
    <ListItem divider secondaryAction={<Typography>{points}</Typography>}>
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
        <Avatar sx={{ borderRadius: 2, width: '50px', height: '50px' }}>
          {avatarUrl ? <img src={avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={displayName} />
    </ListItem>
  );
};
