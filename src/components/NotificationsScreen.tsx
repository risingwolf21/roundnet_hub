import {Save} from "@mui/icons-material"
import {
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Fab,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText
} from "@mui/material"
import React, {useEffect, useState} from "react"
import {useSelector} from "react-redux"
import {RootState} from "src/redux/store"
import CustomAppBar from "./AppBar"
import {LoadingIndicator} from "./LoadingIndicator"
import {useTranslation} from "react-i18next"
import {TFunction} from "i18next"
import {NotificationTags, User} from "src/types/supabaseTypes"
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar"
import {SupabaseUserRepository} from "../repository/UserRepository";

const userTags: NotificationTags[] = ["eventComments", "userRegistration", "paymentRequest", "paymentPending"]

const NotificationsScreenProvider = () => {
    const {user} = useSelector((state: RootState) => state.application);
    const {t} = useTranslation();

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <NotificationsScreen t={t} user={user}/>
}

type NotificationsScreenProps = {
    t: TFunction,
    user: User
}

export const NotificationsScreen = ({user, t}: NotificationsScreenProps) => {

    const [activeUserTags, setActiveUserTags] = useState<NotificationTags[]>(user.notifications ?? []);
    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);

    useEffect(() => {
        Notification.requestPermission().then(result => {
            setNotificationPermissionGranted(result === 'granted')
        })
    }, []);

    const handleChange = (tag: NotificationTags) => {
        if (!activeUserTags.includes(tag)) {
            setActiveUserTags([...activeUserTags, tag])
        } else {
            setActiveUserTags(activeUserTags.filter(x => x !== tag))
        }
    }

    const saveTags = () => {
        setLoading(true);
        SupabaseUserRepository.updateNotificationTags(activeUserTags, user).then(r => {
            setLoading(false);
            if (!r.error) {
                setAlertInfo({message: "Successfully updated your notification preferences", severity: "info"})
            } else {
                setAlertInfo({message: "Something went wrong here: " + r.error.message, severity: "error"})
            }
        });
    }

    return <Box>
        <CustomAppBar navigateBack/>
        <LoadingIndicator loading={false}/>
        <List>
            {
                !notificationPermissionGranted && <ListItemButton key={"requestPermission"}>
                    <ListItemText primary={"Request Notification permissions"}/>
                    <ListItemSecondaryAction>
                        <Button variant={"text"} title={"Request"}/>
                    </ListItemSecondaryAction>
                </ListItemButton>
            }
            {
                userTags.map(x => <ListItemButton key={x} onClick={() => handleChange(x)}
                                                  disabled={!notificationPermissionGranted}>
                    <ListItemAvatar>
                        <Checkbox checked={activeUserTags.includes(x)} onChange={(_) => handleChange(x)}/>
                    </ListItemAvatar>
                    <ListItemText primary={t("notificationTags." + x)}/>
                </ListItemButton>)
            }
        </List>
        <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px"}}
             onClick={saveTags}>
            {
                !loading ? <Save sx={{color: "white"}}/> : <CircularProgress/>
            }
        </Fab>
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Box>
}

export default NotificationsScreenProvider;