import { BRANDING } from '@/utils';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import Box from '@mui/material/Box';

export const LoadingScreen = () => {
  return <Box
    sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    <Typography variant="h5" component="div" sx={{ mb: 2, textAlign: 'center' }}>
      {BRANDING.icon}<br></br>
      {BRANDING.title}
    </Typography>
    <CircularProgress variant={'indeterminate'} size={50}></CircularProgress>
  </Box>
};
