
import { TENANT_LOGO } from '@/utils';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export const LoadingScreen = () => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <LinearProgress sx={{ position: "absolute", left: 0, right: 0, top: 0 }} variant='indeterminate' />
      {
        <img src={TENANT_LOGO} alt="MUI logo" style={{ height: 125, objectFit: 'contain' }} />
      }
    </Box>
  );
};
