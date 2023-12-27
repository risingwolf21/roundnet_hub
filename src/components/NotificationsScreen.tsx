import { Save } from "@mui/icons-material"
import { Box, Checkbox, Fab, List, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"
import { isEqual } from "lodash"
import React, { useEffect, useState } from "react"
import OneSignal from "react-onesignal"
import { useSelector } from "react-redux"
import { RootState } from "src/redux/store"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"
import userTags from "./services/onesignal/userTags"

const NotificationsScreen = () => {

    const [notificationsAllowed, setNotificationsAllowed] = useState(false);
    const [notificationTagsChanged, setNotificationTagsChanged] = useState(false);
    const [activeUserTags, setActiveUserTags] = useState<string[]>([]);
    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        setNotificationsAllowed(OneSignal.User.PushSubscription.optedIn ?? false);
    }, []);

    const handleChange = (tag: string, active: boolean) => {
        if (active) {
            setActiveUserTags([...new Set([...activeUserTags, tag])])
        } else {
            setActiveUserTags(activeUserTags.filter(x => x !== tag))
        }
        setNotificationTagsChanged(!isEqual(activeUserTags.sort(), user?.notificationTags.sort()));
    }

    const saveTags = () => {

    }

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={false} />
        <List>
            {
                userTags.map(x => <ListItemButton key={x.tag} onClick={() => handleChange(x.tag, !activeUserTags.includes(x.tag))}>
                    <ListItemAvatar>
                        <Checkbox checked={activeUserTags.includes(x.tag)} onChange={(e, a) => handleChange(x.tag, a)} />
                    </ListItemAvatar>
                    <ListItemText primary={x.label} />
                </ListItemButton>)
            }
        </List>
        {
            notificationTagsChanged && <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
                onClick={() => { }}>
                {
                    <Save sx={{ color: "white" }} />
                }
            </Fab>
        }
    </Box>
}

export default NotificationsScreen;