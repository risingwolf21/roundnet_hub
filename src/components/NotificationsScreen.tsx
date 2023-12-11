import { Box, List, ListItem, ListItemButton, ListItemText, Switch } from "@mui/material"
import React, { useEffect, useState } from "react"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"
import OneSignal from "react-onesignal"

export const NotificationsScreen = () => {

    const [notificationsAllowed, setNotificationsAllowed] = useState(false);

    useEffect(() => {
        let allowed = OneSignal.Notifications.permissionNative === "granted";
        setNotificationsAllowed(allowed);
    }, []);

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={false} />
        <List>
            {
                !notificationsAllowed && <ListItemButton onClick={() => OneSignal.Notifications.requestPermission()}>
                    <ListItemText primary={"Benachrichtigungen aktivieren"} />
                </ListItemButton>
            }
            <ListItem>
                <ListItemText primary={"Alle Benachrichtigungen"} />
                <Switch
                    edge="end"
                    inputProps={{
                        'aria-labelledby': 'switch-list-label-wifi',
                    }}
                />
            </ListItem>
        </List>
    </Box>
}