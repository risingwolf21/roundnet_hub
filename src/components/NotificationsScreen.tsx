import { Save } from "@mui/icons-material"
import { Box, Checkbox, Fab, List, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"
import React, { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "src/redux/store"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"
import { useTranslation } from "react-i18next"
import { TFunction } from "i18next"
import { NotificationTags, User } from "src/types/supabaseTypes"
import { IUserRepository } from "src/repository/IUserRepository"
import { useDependency } from "src/hooks/useDependency"
import { AlertSnackbar } from "./AlertSnackbar"

const userTags: NotificationTags[] = ["eventComments", "userRegistration", "paymentRequest", "paymentPending"]

const NotificationsScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const { t } = useTranslation();
    const userRepository = useDependency<IUserRepository>("IUserRepository");

    if (!user || !userRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <NotificationsScreen t={t} user={user} userRepository={userRepository} />
}

type NotificationsScreenProps = {
    t: TFunction,
    user: User,
    userRepository: IUserRepository
}

export const NotificationsScreen = ({ user, t, userRepository }: NotificationsScreenProps) => {

    const [notificationTagsChanged, setNotificationTagsChanged] = useState(true);
    const [activeUserTags, setActiveUserTags] = useState<NotificationTags[]>(user.notifications ?? []);

    const handleChange = (tag: NotificationTags, active: boolean) => {
        if (active) {
            setActiveUserTags([...new Set([...activeUserTags, tag])])
        } else {
            setActiveUserTags(activeUserTags.filter(x => x !== tag))
        }
        // setNotificationTagsChanged(!isEqual(activeUserTags.sort(), user.notifications?.sort()));
    }

    const saveTags = () => {
        userRepository.updateNotificationTags(activeUserTags, user);
    }

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={false} />
        <List>
            {
                userTags.map(x => <ListItemButton key={x} onClick={() => handleChange(x, !activeUserTags.includes(x))}>
                    <ListItemAvatar>
                        <Checkbox checked={activeUserTags.includes(x)} onChange={(e, a) => handleChange(x, a)} />
                    </ListItemAvatar>
                    <ListItemText primary={t("notificationTags." + x)} />
                </ListItemButton>)
            }
        </List>
        {
            notificationTagsChanged && <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
                onClick={saveTags}>
                {
                    <Save sx={{ color: "white" }} />
                }
            </Fab>
        }
    </Box>
}

export default NotificationsScreenProvider;