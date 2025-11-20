import { SwipeableDialog } from "@/components/SwipeableDialog"
import AppleIcon from '@mui/icons-material/Apple'
import GoogleIcon from '@mui/icons-material/Google'
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemAvatar from "@mui/material/ListItemAvatar"
import ListItemText from "@mui/material/ListItemText"
import Box from "@mui/system/Box"
import { DialogProps } from "@toolpad/core"

export const MapsProviderDialog = ({ open, onClose }: DialogProps<undefined, "apple_maps" | "google_maps" | null>) => {
  return <SwipeableDialog title="" open={open} onClose={() => onClose(null)} minHeight={10}>
    <Box sx={{ paddingLeft: 0 }}>
      <List>
        <ListItem divider onClick={() => onClose("google_maps")}>
          <ListItemAvatar>
            <GoogleIcon />
          </ListItemAvatar>
          <ListItemText primary={"Google Maps"} />
        </ListItem>
        <ListItem divider onClick={() => onClose("apple_maps")}>
          <ListItemAvatar>
            <AppleIcon />
          </ListItemAvatar>
          <ListItemText primary={"Apple Maps"} />
        </ListItem>
      </List>
    </Box>
  </SwipeableDialog>
}