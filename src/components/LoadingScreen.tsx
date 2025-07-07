import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { BRANDING } from 'src/utils';
import { LoadingIndicator } from './LoadingIndicator';

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
            {BRANDING.title}
          </Typography>
        </Toolbar>
      </AppBar>
      <LoadingIndicator loading={true} />
    </Box>
  );
};
