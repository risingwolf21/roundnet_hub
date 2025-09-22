import { LoadingIndicator } from './LoadingIndicator';

import Box from '@mui/material/Box';

export const LoadingScreen = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <LoadingIndicator loading={true} />
    </Box>
  );
};
