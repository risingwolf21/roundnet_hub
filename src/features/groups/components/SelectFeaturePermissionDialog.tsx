import { Checkbox, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import { SwipeableDialog } from "src/components/SwipeableDialog";

type SelectFeaturePermissionDialogProps = {
  toggle: (feature: Feature | Permission, newValue: boolean) => void;
  list: Feature[] | Permission[];
  enabled: Feature[] | Permission[];
  title: string
  open: boolean
  onClose: () => void
}

export const SelectFeaturePermissionDialog = ({ toggle, list, enabled, title, open, onClose }: SelectFeaturePermissionDialogProps) => {
  return <SwipeableDialog open={open} onClose={() => onClose()} title={title}>
    <List>
      {
        list.map(x => <ListItemButton role={undefined} onClick={() => {
          toggle(x, !enabled.map(x => x.name).includes(x.name))
        }} dense>
          <ListItemIcon>
            <Checkbox
              edge="start"
              checked={enabled.map(x => x.name).includes(x.name)}
              tabIndex={-1}
              disableRipple
              inputProps={{ 'aria-labelledby': x.name }}
            />
          </ListItemIcon>
          <ListItemText id={x.name} primary={x.name} secondary={x.description} />
        </ListItemButton>)
      }
    </List>
  </SwipeableDialog>
}