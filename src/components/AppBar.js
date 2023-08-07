import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button, IconButton, Tab, Tabs } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Close } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const CustomAppBar = ({ logout, drawerOpen, handleMenuClick }) => {
    let navigate = useNavigate();
    const { mode } = useSelector((state) => state.application);

    const tabs = [
        {
            label: "Getränke",
            path: "drinks",
            index: 0
        },
        {
            label: "Training",
            path: "training",
            index: 1
        }
    ];

    const [tab, setTab] = useState(tabs.findIndex(x => "/" + x.path === window?.location?.pathname));

    const handleChange = (event, newValue) => {
        setTab(newValue);
        navigate(tabs[newValue].path);
    }

    return <>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => drawerOpen ? handleMenuClick(false) : handleMenuClick(true)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    {
                        mode === "drinks" && (drawerOpen ? <Close /> : <MenuIcon />)
                    }
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Roundnet Karlsruhe
                </Typography>
                {
                    window?.location?.pathname === "/user" && <Button color="inherit" onClick={logout}>Logout</Button>
                }
            </Toolbar>
            {/* <Tabs variant='fullWidth' indicatorColor="secondary" textColor='inherit'
                value={tab} onChange={handleChange} TabIndicatorProps={{ sx: { height: 3 } }}>
                {
                    tabs.map(x => <Tab label={x.label} id={`full-width-tab-${x.index}`} />)
                }
            </Tabs> */}
        </AppBar>
    </>
}

export default CustomAppBar;