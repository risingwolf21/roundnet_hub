import { Box, Button, DialogContent, DialogContentText } from '@mui/material';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import React from 'react';
import { SliceEvent } from 'src/features/events/slices/eventsSlice';

type CancelTrainingDialogProps = {
  cancelTrainingOpen: boolean;
  setCancelTrainingOpen: (value: boolean) => void;
  cancelTraining: () => void;
  selectedEvent: SliceEvent;
};

export const CancelTrainingDialog = ({
  cancelTrainingOpen,
  setCancelTrainingOpen,
  cancelTraining,
  selectedEvent,
}: CancelTrainingDialogProps) => {
  return (
    <SwipeableDialog
      open={cancelTrainingOpen}
      setOpen={setCancelTrainingOpen}
      title={`Training ${selectedEvent.isCancelled ? 'aktivieren' : 'absagen'}`}
      onClose={() => setCancelTrainingOpen(false)}
    >
      <DialogContent>
        <DialogContentText>
          {selectedEvent.isCancelled
            ? 'Möchtest du diese Training aktivieren? Spieler können anschließend dem Training wieder zu und absagen.'
            : 'Möchtest du diese Training wirklich absagen? Spieler können zu dem Training weder zu noch absagen.'}
        </DialogContentText>
      </DialogContent>
      <Box
        sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => setCancelTrainingOpen(false)}>
          Abbrechen
        </Button>
        <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={cancelTraining}>
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
