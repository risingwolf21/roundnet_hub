import { Box, Button, Typography } from "@mui/material"
import { DialogProps } from "@toolpad/core"
import { History } from "types/supabase"
import React from "react"
import { SwipeableDialog } from "src/components/SwipeableDialog"
import { FullPayment } from "src/types/supabaseTypes"


export const ConfirmPaymentDialog = ({ payload, open, onClose }: DialogProps<FullPayment, boolean>) => {
  return <SwipeableDialog
    open={open}
    onClose={() => onClose(false)}
    title="Zahlung bestätigen"
    actions={
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
          onClick={() => onClose(false)}
        >
          Abbrechen
        </Button>
        <Button
          variant="contained"
          fullWidth
          sx={{
            ml: 1,
            mr: 2,
            mb: 2,
            borderRadius: '50px !important',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            lineSpacing: '24px',
          }}
          onClick={() => onClose(true)}
          autoFocus
        >
          Bestätigen
        </Button>
      </Box>
    }
  >
    <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
      <Typography>Hiermit bestätigst du, dass</Typography>
      <Typography fontWeight={'bold'}>{`${payload.user?.displayName}`}</Typography>
      <Typography fontWeight={'bold'}>{`${payload.user?.email}`}</Typography>
      <Typography>eine Zahlung in Höhe von</Typography>
      <Typography fontWeight={'bold'}>
        {`${payload.history.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €`}
      </Typography>
      <Typography>getätigt hat.</Typography>
    </Box>
  </SwipeableDialog>
}