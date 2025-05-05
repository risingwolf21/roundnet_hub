import { Close } from "@mui/icons-material"
import { Dialog, DialogContent, DialogTitle, IconButton, List, ListItemButton, ListItemText, ListSubheader, Toolbar, Typography } from "@mui/material"
import { DialogProps } from "@toolpad/core"
import { groupBy } from "lodash"
import React from "react"
import { Table } from "../SupabaseClient"

type SelectTableDialogPayload = {
  tables: Table[]
}

export const SelectTableDialog = ({ payload, open, onClose }: DialogProps<SelectTableDialogPayload, Table | null>) => {
  return <Dialog
    open={open}
    onClose={() => onClose(null)}
    scroll={'paper'}
    sx={{
      '.MuiDialog-container > .MuiPaper-root': {
        margin: 0,
        maxHeight: '75vh',
        minHeight: `40vh`,
        width: '100%',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0,
      },
      '.MuiDialog-container': {
        position: 'absolute',
        m: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        alignItems: 'end',
        paddingBottom: 'env(safe-area-inset-bottom)',
      },
    }}>
    <DialogTitle sx={{ p: 0 }}>
      <Toolbar>
        <IconButton color="inherit" aria-label="close drawer" onClick={() => onClose(null)} edge="start" sx={{ mr: 2 }}>
          <Close />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Tabelle auswählen
        </Typography>
      </Toolbar>
    </DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List>
        {Object.entries(groupBy(payload.tables, (x) => x.schema)).map(([key, values]) => (
          <List subheader={<ListSubheader sx={{ fontWeight: "bold", fontSize: "1rem" }}>{key}</ListSubheader>}>
            {
              values.sort((a, b) => a.name.localeCompare(b.name)).map(x => <ListItemButton
                divider
                key={x.schema + "/" + x.name}
                onClick={() => {
                  onClose(x)
                }}
              >
                <ListItemText primary={x.name} secondary={x.schema} />
              </ListItemButton>)
            }
          </List>
        ))}
      </List>
    </DialogContent>
  </Dialog>
}