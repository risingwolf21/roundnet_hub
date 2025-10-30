import LinearProgress from '@mui/material/LinearProgress';

export const LoadingIndicator = ({ loading }: { loading: boolean }) => {
  if (loading) {
    return <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />;
  }
  return null;
};
