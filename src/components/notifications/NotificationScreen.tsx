import {useSelector} from "react-redux";
import {RootState} from "../../redux/store";
import {can} from "../../utils/PermissionService";
import {AlertSnackbar} from "../AlertSnackbar";
import React from "react";
import {Navigate} from "react-router-dom";
import {HOMEPAGE} from "../../constants";
import {Container, Fab, Grid, LinearProgress, List, ListItem, ListItemText} from "@mui/material";
import CustomAppBar from "../AppBar";
import {DoneAll} from "@mui/icons-material";
import {notificationsSelector} from "../../redux/notificationsSlice";
import {toast} from "react-toastify";
import {SupabaseUserRepository} from "../../repository/UserRepository";

const NotificationScreen = () => {
    const {loading, error} = useSelector((state: RootState) => state.notifications);
    const {user} = useSelector((state: RootState) => state.application);
    const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));

    if (!can("view", "notifications") || !user)
        return <Navigate to={`/${HOMEPAGE}`} replace={true}/>

    const markNotificationsAsRead = () => {
        SupabaseUserRepository.markNotificationsAsRead(user);
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack/>
        {
            loading && <LinearProgress sx={{position: "fixed", top: 56, left: 0, right: 0}}/>
        }
        <List sx={{width: "100%"}}>
            {
                notifications.map(notification => {
                    return <ListItem key={notification.id}>
                        <ListItemText primary={notification.title} secondary={notification.body}/>
                    </ListItem>
                })
            }
        </List>
        <Fab variant={"extended"}
             color={"primary"}
             sx={{
                 color: "#fff",
                 backgroundColor: (theme) => theme.palette.primary.main,
                 position: "fixed",
                 right: "16px",
                 bottom: "56px",
                 mb: "16px"
             }}
             onClick={markNotificationsAsRead}>
            <DoneAll sx={{color: "white", mr: 1}}/>
            Als gelesen markieren
        </Fab>
        {
            error && <AlertSnackbar alertInfo={{message: error, severity: "error"}}/>
        }
    </Grid>
}

export default NotificationScreen;