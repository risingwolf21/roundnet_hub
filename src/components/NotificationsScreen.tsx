import { Box, List, ListItem, ListItemButton, ListItemText, Switch } from "@mui/material"
import React, { useEffect, useState } from "react"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"
import OneSignal from "react-onesignal"

export const NotificationsScreen = () => {

    const [notificationsAllowed, setNotificationsAllowed] = useState(false);

    useEffect(() => {
        setNotificationsAllowed(OneSignal.User.PushSubscription.optedIn ?? false);
    }, []);

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={false} />
        <List>
            <ListItemButton onClick={() => OneSignal.Slidedown.promptPush()}>
                <ListItemText primary={"Benachrichtigungen bearbeiten"} />
            </ListItemButton>
        </List>
    </Box>
}