import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { supabase } from './services/supabase/supabaseClient';

const NotVerifiedScreen = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'primary', pt: "env(safe-area-inset-top)" }}>
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
          <Button sx={{ color: 'white' }} onClick={() => supabase.auth.signOut()}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⚠️</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold', textAlign: "center" }}>Du bist zur Zeit nicht verifiziert. Um die Funktionen nutzen zu können, musst du vorher von einem
          Administrator verifiziert werden.</Typography>
      </Box>
    </Box>
  );
};

export default NotVerifiedScreen;
