import { Save } from "@mui/icons-material"
import { Box, Checkbox, Fab, List, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"
import React, { useEffect, useState } from "react"
import OneSignal from "react-onesignal"
import { useSelector } from "react-redux"
import { useDependency } from "src/hooks/useDependency"
import { RootState } from "src/redux/store"
import { IUserRepository } from "src/repository/IUserRepository"
import { AlertMessage, AlertSnackbar } from "./AlertSnackbar"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"
import userTags from "./services/onesignal/userTags"

const NotificationsScreen = () => {

    const [notificationsAllowed, setNotificationsAllowed] = useState(false);
    const [activeUserTags, setActiveUserTags] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<AlertMessage | null>(null);
    const { user } = useSelector((state: RootState) => state.application);
    const userRepository = useDependency<IUserRepository>("IUserRepository");

    useEffect(() => {
        setNotificationsAllowed(OneSignal.User.PushSubscription.optedIn ?? false);
    }, []);

    useEffect(() => {
        if (user)
            setActiveUserTags(user.notificationTags);
    }, [user]);

    const handleChange = (tag: string, active: boolean) => {
        if (active) {
            setActiveUserTags([...new Set([...activeUserTags, tag])])
        } else {
            setActiveUserTags(activeUserTags.filter(x => x !== tag))
        }
    }

    const saveTags = () => {
        if (user && userRepository){
            userRepository.updateNotificationTags(activeUserTags, user);
            const userTagsToAdd: { [key: string]: string } = {};
            const userTagsToRemove: string[] = [];
            activeUserTags.forEach(x => userTagsToAdd[x] = "1")
            userTags.filter(x => !activeUserTags.includes(x.tag)).forEach(x => userTagsToRemove.push(x.tag))
            OneSignal.User.addTags(userTagsToAdd);
            OneSignal.User.removeTags(userTagsToRemove);
        }
        else
            setErrorMessage({ message: "Something went wrong trying to update your notification permissions", severity: "warning" });
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
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
            onClick={saveTags}>
            {
                <Save sx={{ color: "white" }} />
            }
        </Fab>
        <AlertSnackbar alertInfo={errorMessage} close={null} />
    </Box>
}

export default NotificationsScreen;