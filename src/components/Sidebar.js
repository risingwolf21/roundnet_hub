import { Box, Divider, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SwipeableDrawer, Toolbar, useTheme } from "@mui/material";
import React, { useState } from "react";
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from "react-router-dom";
import { compose } from "redux";
import { connect } from "react-redux";
import { useAddToHomescreenPrompt } from "../AddToHomeScreen";
import { Download } from "@mui/icons-material";

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
    }
]

const SideBar = ({ open, onClose, onOpen, profile, auth }) => {

    let navigate = useNavigate();
    let theme = useTheme();

    const [_, promptToInstall] = useAddToHomescreenPrompt();
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    React.useEffect(() => {
        isPWAInstalled();
    }, []);

    const isPWAInstalled = async () => {
        if ("getInstalledRelatedApps" in window.navigator) {
            const relatedApps = await navigator.getInstalledRelatedApps();
            let installed = false;
            relatedApps.forEach((app) => {
                //if your PWA exists in the array it is installed
                console.log(app.platform, app.url);
                console.log("current : " + window.location.href)
                if (
                    app.url === window.location.href
                ) {
                    installed = true;
                }
            });
            setIsAppInstalled(installed);
        }
    };

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const fullList = () => {
        return (
            <div
                role="presentation"
                style={{ width: "250px" }}
                onClick={onClose}
                onKeyDown={onClose}>
                <Box sx={{ justifyContent: "space-between", display: "flex", flexDirection: "column", height: "100vh" }}>
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
                            profile.role !== "user" && <>
                                <Divider />
                                <ListSubheader>Admin Optionen</ListSubheader>
                                {
                                    ADMIN_SCREENS.filter(x => x.role === profile.role || profile.role === "admin").map((item, index) => (
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
                    {
                        !isAppInstalled && <ListItem key={"installApp"} onClick={promptToInstall}>
                            <ListItemIcon>
                                <Download />
                            </ListItemIcon>
                            <ListItemText primary={"Als App Installieren"} />
                        </ListItem>
                    }
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
export default compose(
    connect((state) => ({
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(SideBar);