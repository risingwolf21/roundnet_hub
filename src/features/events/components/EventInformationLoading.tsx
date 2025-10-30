import { LoadingEventInformation } from './LoadingEventInformation';

import List from '@mui/material/List';

const EventInformationLoading = () => {
  return (
    <List sx={{ p: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
      <LoadingEventInformation />
    </List>
  );
};

export default EventInformationLoading;
