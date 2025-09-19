import { EventsUserView } from '@/types/supabaseTypes';
import { Box, Button, DialogContent, DialogContentText } from '@mui/material';
import { DialogProps } from '@toolpad/core';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

export const CancelTrainingDialog = ({ payload, open, onClose }: DialogProps<EventsUserView, boolean>) => {
  return (
    <SwipeableDialog
      open={open}
      title={`Training ${payload.isCancelled ? 'aktivieren' : 'absagen'}`}
      onClose={() => onClose(false)}
    >
      <DialogContent>
        <DialogContentText>
          {payload.isCancelled
            ? 'Möchtest du diese Training aktivieren? Spieler können anschließend dem Training wieder zu und absagen.'
            : 'Möchtest du diese Training wirklich absagen? Spieler können zu dem Training weder zu noch absagen.'}
        </DialogContentText>
      </DialogContent>
      <Box
        sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => onClose(false)}>
          Abbrechen
        </Button>
        <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={() => onClose(true)}>
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
