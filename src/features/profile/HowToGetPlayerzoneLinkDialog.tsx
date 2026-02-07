import Close from '@mui/icons-material/Close';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { DialogProps } from '@toolpad/core';
import PzAccount from '../../images/pz_account.png';
import PzHomePage from '../../images/pz_homepage.png';
import PzProfile from '../../images/pz_profile.png';

export const HowToGetPlayerLinkDialog = ({ open, onClose }: DialogProps<undefined>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose()}>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose()}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Playerzone Link erhalten
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }} gutterBottom>
          1. In der Playerzone anmelden und rechts oben auf das Profilbild klicken
        </Typography>
        <img src={PzHomePage} loading="lazy" width={'100%'} style={{ objectFit: 'contain' }} />

        <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }} gutterBottom>
          2. In Ihrem Account auf den Profilnamen klicken
        </Typography>
        <img src={PzAccount} loading="lazy" width={'100%'} style={{ objectFit: 'contain' }} />

        <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }} gutterBottom>
          3. Kopieren Sie die URL/Link von der Seite auf der Sie gerade sind.
        </Typography>
        <img src={PzProfile} loading="lazy" width={'100%'} style={{ objectFit: 'contain' }} />
      </Box>
    </Dialog>
  );
};
