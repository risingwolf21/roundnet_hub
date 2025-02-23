import React from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import Layout from './Layout';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { supabase } from './services/supabase/supabaseClient';

export const LoadingScreen = () => {
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
        </Toolbar>
      </AppBar>
      <LoadingIndicator loading={true} />
    </Box>
  );
};
