import { EventsUserView } from '@/types/supabaseTypes';
import { DialogProps } from '@toolpad/core';
import { useState } from 'react';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { DeleteEventType, DeletionType } from '../types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

export const DeleteEventDialog = ({ payload, open, onClose }: DialogProps<EventsUserView, DeleteEventType | null>) => {
  const [deletion, setDeletion] = useState<DeleteEventType>('This Event');

  return (
    <SwipeableDialog
      open={open}
      onClose={() => onClose(null)}
      title={payload.recurrence === 'None' ? 'Delete event' : 'Delete recurring event'}
    >
      {payload.recurrence !== 'None' && (
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
        <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => onClose(null)}>
          Abbrechen
        </Button>
        <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={() => onClose(deletion)}>
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
