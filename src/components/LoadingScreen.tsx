import { Box } from '@mui/material';
import React from 'react';
import { LoadingIndicator } from './LoadingIndicator';

export const LoadingScreen = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <LoadingIndicator loading={true} />
    </Box>
  );
};
