import { Box, Divider, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SwipeableDrawer, Tabs, Toolbar, useTheme } from "@mui/material";
import React from "react";
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
        key: "admin/drinks",
        icon: <LiquorIcon />,
        role: "procure"
    },
    {
        label: "Offene Zahlungen - Admin",
        key: "admin/drinks/payments",
        icon: <PaymentIcon />,
        role: "finance"
    },
    {
        label: "Benutzer - Admin",
        key: "admin/users",
        icon: <PeopleIcon />,
        role: "admin"
    },
    {
        label: "Verlauf - Admin",
        key: "admin/drinks/history",
        icon: <PeopleIcon />,
        role: "admin"
    }
]

const SideBar = ({ open, onClose, onOpen }) => {

    let navigate = useNavigate();
    const { user } = useAuth();
    let theme = useTheme();

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

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
                </Box>
            </div>
        );
    };

    return <SwipeableDrawer
        anchor="left"
        open={open}
        onClose={onClose}
        onOpen={onOpen}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}>
        {fullList()}
    </SwipeableDrawer>

}
export default SideBar;