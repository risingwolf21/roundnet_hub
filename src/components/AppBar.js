import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button, IconButton } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';

const CustomAppBar = ({ logout, drawerOpen, handleMenuClick }) => {

    return <Box sx={{ flexGrow: 1 }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => drawerOpen ? handleMenuClick(false) : handleMenuClick(true)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Roundnet Karlsruhe
                </Typography>
                {
                    window?.location?.pathname === "/user" && <Button color="inherit" onClick={logout}>Logout</Button>
                }
            </Toolbar>
        </AppBar>
    </Box>
}

export default CustomAppBar;