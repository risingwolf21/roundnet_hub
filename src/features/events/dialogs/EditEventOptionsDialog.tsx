import { Box, Button, DialogContent, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import React, { useState } from 'react';
import { CreateEventOption } from '../types';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { DialogProps } from '@toolpad/core';

export const EditEventOptionsDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<undefined, null | CreateEventOption>) => {
  const [saveEventOption, setSaveEventOption] = useState<CreateEventOption>('UpdateSingle');

  return (
    <SwipeableDialog open={open} onClose={() => onClose(null)} title={'Event aktualisieren'}>
      <DialogContent>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <RadioGroup
            aria-labelledby="demo-radio-buttons-group-label"
            value={saveEventOption}
            onChange={(e) => {
              setSaveEventOption(e.target.value as CreateEventOption);
            }}
            name="radio-buttons-group"
          >
            <FormControlLabel
              value={'UpdateSingle'}
              control={<Radio />}
              label={'Nur dieses Event aktualisieren'}
              key={'UpdateSingle'}
            />
            <FormControlLabel
              value={'UpdateRecurrence'}
              control={<Radio />}
              label={'Dieses und alle folgenden Events aktualisieren'}
              key={'UpdateRecurrence'}
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <Box
        sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => onClose(null)}>
          Abbrechen
        </Button>
        <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={() => onClose(saveEventOption)}>
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
