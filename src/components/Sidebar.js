import { Divider, List, ListItem, ListItemIcon, ListItemText, SwipeableDrawer, Toolbar } from "@mui/material";
import React from "react";
import InboxIcon from '@mui/icons-material/Inbox';
import MailIcon from '@mui/icons-material/Mail';
import AccountIcon from '@mui/icons-material/AccountBox';
import LiquorIcon from '@mui/icons-material/Liquor';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from "react-router-dom";

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
    }
];

const SideBar = ({ open, onClose, onOpen, onClick }) => {

    let navigate = useNavigate();

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const fullList = () => {
        return (
            <div
                role="presentation"
                style={{width: "250px"}}
                onClick={onClose}
                onKeyDown={onClose}
            >
                <List>
                    <Toolbar />
                    {SCREENS.map((item, index) => (
                        <ListItem button key={item} divider onClick={() => navigate(item.key)}>
                            <ListItemIcon>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItem>
                    ))}
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

export default SideBar;