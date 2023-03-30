import { Divider, List, ListItem, ListItemIcon, ListItemText, SwipeableDrawer, Toolbar } from "@mui/material";
import React from "react";
import InboxIcon from '@mui/icons-material/Inbox';
import MailIcon from '@mui/icons-material/Mail';
import { useNavigate } from "react-router-dom";

const SCREENS = [
    {
        label: "Zusammenfassung",
        key: "history"
    },
    {
        label: "Benutzer",
        key: "user"
    },
    {
        label: "Getränke",
        key: "drinks"
    }
];

const SideBar = ({ open, onClose, onOpen, onClick }) => {

    let navigate = useNavigate();

    const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const fullList = () => {
        return (
            <div
                role="presentation"
                onClick={onClose}
                onKeyDown={onClose}
            >
                <List>
                    <Toolbar/>
                    {SCREENS.map((item, index) => (
                        <ListItem button key={item} onClick={() => navigate(item.key)}>
                            <ListItemIcon>
                                {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
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