import { Box, Drawer, Toolbar } from "@mui/material"
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ApprovalIcon from '@mui/icons-material/Approval';
import EditIcon from '@mui/icons-material/Edit';

const CustomDrawer = ({ dispatch }) => {

    return <Box
        component="nav"
        sx={{ width: { sm: "15%" }, flexShrink: { sm: 0 } }}>

        <Drawer
            variant="permanent"
            anchor="left"
            sx={{
                width: "15%",
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: "15%", boxSizing: 'border-box' },
            }}
            open>
            <Toolbar />
            <Box sx={{ overflow: "auto" }}>
                <List>
                    <ListItem disablePadding>
                        <ListItemButton>
                            <ListItemIcon>
                                <ApprovalIcon />
                            </ListItemIcon>
                            <ListItemText primary={"Getränkeliste"} />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton>
                            <ListItemIcon>
                                <EditIcon />
                            </ListItemIcon>
                            <ListItemText primary={"Anmeldung"} />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Drawer>
    </Box>
}

export default CustomDrawer;