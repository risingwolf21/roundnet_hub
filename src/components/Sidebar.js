import { Divider, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SwipeableDrawer, Toolbar, useTheme } from "@mui/material";
import React from "react";
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from "react-router-dom";
import { compose } from "redux";
import { connect } from "react-redux";

const SCREENS = [
    {
        label: "Benutzer",
        key: "user",
        icon: <AccountIcon />
    },
    {
        label: "Getränke",
        key: "drinks",
        icon: <LiquorIcon />
    },
    {
        label: "Bezahlen",
        key: "pay",
        icon: <PaymentIcon />
    }
];

const ADMIN_SCREENS = [
    {
        label: "Getränke - Admin",
        key: "drinks-admin",
        icon: <LiquorIcon />
    },
    {
        label: "Offene Zahlungen - Admin",
        key: "payments-admin",
        icon: <PaymentIcon />
    },
    {
        label: "Benutzer - Admin",
        key: "users-admin",
        icon: <PeopleIcon />
    }
]

const SideBar = ({ open, onClose, onOpen, profile, auth }) => {

    let navigate = useNavigate();
    let theme = useTheme();

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const fullList = () => {
        return (
            <div
                role="presentation"
                style={{ width: "250px" }}
                onClick={onClose}
                onKeyDown={onClose}>
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
                        profile.role === "admin" && <>
                            <Divider />
                            <ListSubheader>Admin Optionen</ListSubheader>
                            {
                                ADMIN_SCREENS.map((item, index) => (
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
export default compose(
    connect((state) => ({
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(SideBar);