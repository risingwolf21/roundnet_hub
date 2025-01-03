import { Refresh } from '@mui/icons-material';
import { Button, Grid2, Typography } from '@mui/material';
import React from 'react';

export const FallbackComponent = ({ message, resetError }: { message: String; resetError: () => void }) => {
  return (
    <Grid2
      container
      spacing={0}
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '100vh' }}
    >
      <Typography sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '25pt' }}>🚩🚩🚩</Typography>
      <Typography
        sx={{
          mt: 2,
          wordWrap: 'normal',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '18pt',
          color: 'primary',
          padding: 2,
        }}
      >
        {message}
      </Typography>
      <Button startIcon={<Refresh />} onClick={resetError}>
        Aktualisieren
      </Button>
    </Grid2>
  );
};
