import { Checkbox, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { DialogProps } from "@toolpad/core";
import React from "react";
import { SwipeableDialog } from "src/components/SwipeableDialog";

type SelectFeaturePermissionDialogProps = {
  toggle: (feature: Feature | Permission, newValue: boolean) => void;
  list: Feature[] | Permission[];
  enabled: Feature[] | Permission[];
  title: string
}

export const SelectFeaturePermissionDialog = ({ payload, open, onClose }: DialogProps<SelectFeaturePermissionDialogProps, null>) => {
  return <SwipeableDialog open={open} onClose={() => onClose(null)} title={payload.title}>
    <List>
      {
        payload.list.map(x => <ListItemButton role={undefined} onClick={() => {
          payload.toggle(x, !payload.enabled.includes(x))
        }} dense>
          <ListItemIcon>
            <Checkbox
              edge="start"
              checked={payload.enabled.includes(x)}
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