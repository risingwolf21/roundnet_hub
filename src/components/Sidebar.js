import { Divider, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SwipeableDrawer, Toolbar } from "@mui/material";
import React from "react";
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import { useNavigate } from "react-router-dom";
import { compose } from "redux";
import { connect } from "react-redux";

const SCREENS = [
    {
        label: "Verlauf",
        key: "history",
        icon: <HistoryIcon />
    },
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
    }
]

const SideBar = ({ open, onClose, onOpen, profile, auth }) => {

    let navigate = useNavigate();

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const fullList = () => {
        return (
            <div
                role="presentation"
                style={{ width: "250px" }}
                onClick={onClose}
                onKeyDown={onClose}
            >
                <List>
                    <Toolbar />
                    {SCREENS.map((item, index) => (
                        <ListItem button key={item.key} divider onClick={() => navigate(item.key)}>
                            <ListItemIcon>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItem>
                    ))}

                    {
                        profile.role === "admin" && <>
                            <Divider/>
                            <ListSubheader>Admin Optionen</ListSubheader>
                            {
                                ADMIN_SCREENS.map((item, index) => (
                                    <ListItem button key={item.key} divider onClick={() => navigate(item.key)}>
                                        <ListItemIcon>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText primary={item.label} />
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