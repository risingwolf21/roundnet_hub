import { Warning } from '@mui/icons-material';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import React from 'react';

const NotVerifiedScreen = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'primary' }}>
        <Toolbar
          sx={{
            width: 'calc(100% - 48px)',
            maxWidth: 1400,
            mx: 'auto',
          }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Roundnet Karlsruhe
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        <Warning fontSize="large" sx={{ color: 'primary' }} />
        <Typography sx={{ mt: 2, wordWrap: 'normal', textAlign: 'center', color: 'primary', padding: 2 }}>
          Du bist zur Zeit nicht verifiziert. Um die Funktionen nutzen zu können, musst du vorher von einem
          Administrator verifiziert werden.
        </Typography>
        <Button onClick={() => window.location.reload()}>Aktualisieren</Button>
      </Box>
    </Box>
  );
};

export default NotVerifiedScreen;
