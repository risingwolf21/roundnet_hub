import { Info, Refresh } from '@mui/icons-material';
import { AppBar, Button, Grid2, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { BRANDING } from '@/utils';

const UpdateAvailable = ({ update }: { update: () => void }) => {
  return (
    <Grid2>
      <AppBar
        position="sticky"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'primary', pt: 'env(safe-area-inset-top)' }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {BRANDING.title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Grid2
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}
      >
        <Info fontSize="large" sx={{ color: 'primary' }} />
        <Typography sx={{ mt: 2, wordWrap: 'normal', textAlign: 'center', color: 'primary', padding: 2 }}>
          Es ist ein Update für diese App vorhanden. Bitte aktualisiere die Seite
        </Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={update}>
          Update
        </Button>
      </Grid2>
    </Grid2>
  );
};

export default UpdateAvailable;
