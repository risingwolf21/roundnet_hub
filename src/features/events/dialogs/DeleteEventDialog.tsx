import { Box, Button, DialogContent, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import React, { useState } from 'react';
import { DeleteEventDialogProps, DeleteEventType, DeletionType } from '../types';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

export const THIS_EVENT = 'THIS_EVENT';
export const THIS_AND_FOLLOWING_EVENT = 'THIS_AND_FOLLOWING_EVENT';

export const DeleteEventDialog = ({ open, handleClose, setOpen, selectedEvent }: DeleteEventDialogProps) => {
  const [deletion, setDeletion] = useState<DeleteEventType>('This Event');

  return (
    <SwipeableDialog
      open={open}
      setOpen={setOpen}
      onClose={() => handleClose(null)}
      title={selectedEvent.recurrence === 'None' ? 'Delete event' : 'Delete recurring event'}
    >
      {selectedEvent.recurrence !== 'None' && (
        <DialogContent>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <RadioGroup
              aria-labelledby="demo-radio-buttons-group-label"
              value={deletion}
              defaultValue={deletion}
              onChange={(e) => {
                if (e.target.value === '0') setDeletion('This Event');
                else setDeletion('This and following events');
              }}
              name="radio-buttons-group"
            >
              <FormControlLabel
                value={DeletionType.ThisEvent}
                control={<Radio checked={deletion === 'This Event'} />}
                label="This event"
              />
              <FormControlLabel
                value={DeletionType.ThisAndFollowingEvents}
                control={<Radio checked={deletion === 'This and following events'} />}
                label="This and following events"
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
      )}
      <Box
        sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => handleClose(null)}>
          Abbrechen
        </Button>
        <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={() => handleClose(deletion)}>
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
