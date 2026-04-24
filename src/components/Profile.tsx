import { DialogProps } from '@toolpad/core';
import pzLogo from '../images/pz_logo.svg';

import { useProfile } from '@/tanstack/user';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import Close from '@mui/icons-material/Close';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Diamond from '@mui/icons-material/Diamond';
import Launch from '@mui/icons-material/Launch';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type ProfilePayload = {
  userId: string;
};

const Content = ({ payload: { userId }, onClose }: DialogProps<ProfilePayload, null>) => {

  const { data: profile } = useProfile(userId);

  return (
    <>
      <AppBar sx={{ position: 'static', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>
      <List sx={{ pl: 2, pr: 2, pb: 8 }}>
        <Container
          key={'avatar'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            m: 2,
            p: 0,
            width: 'auto',
          }}
        >
          <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
            {
              profile?.avatarUrl ? (
                <img src={profile?.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
              ) : (
                <AddPhotoAlternateOutlined sx={{ fontSize: '50px' }} />
              )
            }
          </Avatar>
          <Typography variant={'h5'} sx={{ mt: 4 }}>
            {profile?.displayName}
          </Typography>
        </Container>
        {
          profile?.player?.effective_rating_cached && (
            <ListItem
              key={'effective_rating'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
            >
              <ListItemAvatar>
                <Diamond />
              </ListItemAvatar>
              <ListItemText primary={profile.player.effective_rating_cached.toFixed()} secondary={'Effektiver Index'} />
            </ListItem>
          )
        }
        {
          profile?.player?.matches_played && (
            <ListItem
              key={'matches_played'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
            >
              <ListItemAvatar>
                <SportsVolleyballIcon />
              </ListItemAvatar>
              <ListItemText primary={profile.player.matches_played} secondary={'Gespielte Matches'} />
            </ListItem>
          )
        }
        {
          profile?.player?.rg_id && profile.player?.rg_link && (
            <>
              <ListItem
                key={'rg_id'}
                disableGutters
                sx={{
                  '&.MuiListItem-root': { p: 0 },
                }}
                secondaryAction={
                  <>
                    <IconButton
                      onClick={() =>
                        window.open(profile.player?.rg_link ?? undefined, '_blank', 'noopener,noreferrer')
                      }
                    >
                      <Launch />
                    </IconButton>
                    <IconButton onClick={() => navigator.clipboard.writeText(profile.player?.rg_id ?? '')}>
                      <ContentCopy />
                    </IconButton>
                  </>
                }
              >
                <ListItemAvatar>
                  <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
                </ListItemAvatar>
                <ListItemText primary={profile.player.rg_id} secondary={'Roundnet Germany ID'} />
              </ListItem>
              <ListItem
                key={'rgx'}
                disableGutters
                sx={{
                  '&.MuiListItem-root': { p: 0 },
                }}
                secondaryAction={
                  profile.player?.pro_status ? (
                    <Chip
                      variant="outlined"
                      label="Pro Status"
                      sx={{ mx: 2, borderRadius: 3, background: 'black', color: 'white' }}
                    />
                  ) : undefined
                }
              >
                <ListItemAvatar>
                  <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
                </ListItemAvatar>
                <ListItemText primary={profile.player.rg_index} secondary={'Roundnet Germany Index'} />
              </ListItem>
            </>
          )
        }
      </List>
    </>
  );
};
export const ProfileDialog = ({ payload, open, onClose }: DialogProps<ProfilePayload, null>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <Content onClose={onClose} open={open} payload={payload} />
    </Dialog>
  );
};
