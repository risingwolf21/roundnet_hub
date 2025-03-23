import { Close } from "@mui/icons-material"
import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography } from "@mui/material"
import { DialogProps } from "@toolpad/core/useDialogs"
import React from "react"

export const DisplayStoryDialog = ({ payload, open, onClose }: DialogProps<string>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose()}>
    <Box>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => onClose()}>
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>
      <img style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "contain" }} src={payload} width={"100%"} height={"100%"} />
    </Box>
  </Dialog>
}