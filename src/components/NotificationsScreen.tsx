import { Box, List, ListItemButton, ListItemText } from "@mui/material"
import React, { useEffect, useState } from "react"
import OneSignal from "react-onesignal"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"

export const NotificationsScreen = () => {

    const [notificationsAllowed, setNotificationsAllowed] = useState(false);

    useEffect(() => {
        setNotificationsAllowed(OneSignal.User.PushSubscription.optedIn ?? false);
    }, []);

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={false} />
        <List>
            <ListItemButton onClick={() => OneSignal.Slidedown.promptPushCategories()}>
                <ListItemText primary={"Benachrichtigungen bearbeiten"} />
            </ListItemButton>
        </List>
    </Box>
}