import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button, IconButton } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AccountCircle, ArrowBack, Close } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const CustomAppBar = ({ drawerOpen, handleMenuClick }) => {
    const navigate = useNavigate();
    const { mode } = useSelector((state) => state.application);

    return <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
        <Toolbar>
            {
                false && mode === "drinks" && <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => drawerOpen ? handleMenuClick(false) : handleMenuClick(true)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    {
                        drawerOpen ? <Close /> : <MenuIcon />
                    }
                </IconButton>
            }
            {
                window.history.state && window.history.state.idx > 0 && <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    <ArrowBack />
                </IconButton>
            }
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Roundnet Karlsruhe
            </Typography>
            <IconButton color="inherit" onClick={() => navigate("/user")}>
                <AccountCircle />
            </IconButton>
        </Toolbar>
    </AppBar>
}

export default CustomAppBar;