import { Box, Divider, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SwipeableDrawer, Toolbar, useTheme, Tabs, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import raw from '../git_commit.txt';

const SCREENS = [
    {
        label: "Benutzer",
        key: "user",
        icon: <AccountIcon />
    },
    {
        label: "History",
        key: "history",
        icon: <AccountIcon />
    },
    {
        label: "Getränke",
        key: "drinks",
        icon: <LiquorIcon />
    },
    {
        label: "Bezahlen",
        key: "payments",
        icon: <PaymentIcon />
    }
];

const ADMIN_SCREENS = [
    {
        label: "Getränke - Admin",
        key: "drinks-admin",
        icon: <LiquorIcon />,
        role: "procure"
    },
    {
        label: "Offene Zahlungen - Admin",
        key: "payments-admin",
        icon: <PaymentIcon />,
        role: "finance"
    },
    {
        label: "Benutzer - Admin",
        key: "users-admin",
        icon: <PeopleIcon />,
        role: "admin"
    },
    {
        label: "Verlauf - Admin",
        key: "history-admin",
        icon: <PeopleIcon />,
        role: "admin"
    }
]

const SideBar = ({ open, onClose, onOpen }) => {

    let navigate = useNavigate();
    const { user } = useAuth();
    let theme = useTheme();
    const [version, setVersion] = useState("");

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    useEffect(() => {
        fetch(raw)
            .then(r => r.text())
            .then(text => {
                setVersion(text.slice(0, 7));
            });
    }, [raw]);

    const fullList = () => {
        return (
            <div
                role="presentation"
                style={{ width: "250px" }}
                onClick={onClose}
                onKeyDown={onClose}>
                <Box>
                    <List>
                        <Toolbar />
                        {SCREENS.map((item, index) => (
                            <ListItem button key={item.key} divider onClick={() => navigate(item.key)} >
                                <ListItemIcon sx={{ color: window?.location?.pathname === ("/" + item.key) ? theme.palette.secondary.main : "primary" }} >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.label} sx={{ color: window?.location?.pathname === ("/" + item.key) ? theme.palette.secondary.main : "primary" }} />
                            </ListItem>
                        ))}

                        {
                            user.role !== "user" && <>
                                <Divider />
                                <ListSubheader>Admin Optionen</ListSubheader>
                                {
                                    ADMIN_SCREENS.filter(x => x.role === user.role || user.role === "admin").map((item, index) => (
                                        <ListItem button key={item.key} divider onClick={() => navigate(item.key)}>
                                            <ListItemIcon sx={{ color: window?.location?.pathname === ("/" + item.key) ? theme.palette.secondary.main : "primary" }}>
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText primary={item.label} sx={{ color: window?.location?.pathname === ("/" + item.key) ? theme.palette.secondary.main : "primary" }} />
                                        </ListItem>
                                    ))
                                }
                            </>
                        }
                    </List>
                    <Typography sx={{ position: "fixed", bottom: 0, left: 0, width: "250px", textAlign: "center" }}>Version: {version}</Typography>
                </Box>
            </div>
        );
    };

    return <SwipeableDrawer
        anchor={"left"}
        open={open}
        onClose={onClose}
        onOpen={onOpen}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}>
        {fullList()}
    </SwipeableDrawer>

}
export default SideBar;