import { Button, Typography } from '@mui/material';
import { Box } from '@mui/system';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

type EnterPointDialogProps = {
  open: boolean;
  t: TFunction;
  setOpen: (value: boolean) => void;
  increaseChallengePoint: () => void;
};

const EnterPointDialog = ({ open, setOpen, t, increaseChallengePoint }: EnterPointDialogProps) => {
  return (
    <SwipeableDialog
      title="Punkt hinzufügen"
      open={open}
      onClose={() => setOpen(false)}
      minHeight={40}
      setOpen={setOpen}
      actions={<Button onClick={increaseChallengePoint}>{t('confirm')}Bestätigen</Button>}
    >
      <Typography m={2}>Hiermit trägst du einen Punkt für die Serve Challenge ein</Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexGrow: 1,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Button
          variant="outlined"
          fullWidth
          sx={{
            ml: 2,
            mr: 1,
            mb: 2,
            borderRadius: '50px !important',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            lineSpacing: '24px',
          }}
          onClick={() => setOpen(false)}
        >
          {t('cancel')}
        </Button>
      </Box>
    </SwipeableDialog>
  );
};

export default withTranslation()(EnterPointDialog);
