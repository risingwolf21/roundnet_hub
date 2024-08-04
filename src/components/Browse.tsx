import {
    AccountCircle,
    EmojiEvents,
    Euro,
    History,
    Info,
    Key,
    Liquor,
    Notifications,
    SportsHandball
} from "@mui/icons-material";
import {Avatar, Badge, Box, List, ListItem, ListItemAvatar, ListItemButton, ListItemText} from "@mui/material";
import {TFunction} from "i18next";
import React from "react";
import {withTranslation} from 'react-i18next';
import {useNavigate} from "react-router";
import {can} from "src/utils/PermissionService";
import CustomAppBar from "./AppBar";
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import {notificationsSelector} from "../features/notifications/slices/notificationsSlice";

const Browse = ({t}: { t: TFunction }) => {

    const navigate = useNavigate();
    const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));

    return <Box>
        <CustomAppBar/>
        <List>
            {
                can("view", "user") && <ListItemButton key={"account"} onClick={() => navigate("/user")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <AccountCircle/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.account")}/>
                </ListItemButton>
            }
            {
                can("view", "payments") &&
                <ListItemButton key={"payments"} onClick={() => navigate("/payments")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <Euro/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.payment")}/>
                </ListItemButton>
            }
            {
                can("view", "history") &&
                <ListItemButton key={"history"} onClick={() => navigate("/history")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <History/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.history")}/>
                </ListItemButton>
            }
            {
                can("view", "drink") &&
                <ListItemButton key={"drinks"} onClick={() => navigate("/drinks")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <Liquor/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("navigation.drinks")}/>
                </ListItemButton>
            }
            {
                can("view", "training") &&
                <ListItemButton key={"training"} onClick={() => navigate("/training")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <SportsHandball/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("navigation.training")}/>
                </ListItemButton>
            }
            {
                can("view", "keyFinder") &&
                <ListItemButton key={"keys"} onClick={() => navigate("/keys")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <Key/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.keys")}/>
                </ListItemButton>
            }
            {
                can("view", "notifications") &&
                <ListItemButton key={"notifications"} onClick={() => navigate("/notifications")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Badge color="secondary" variant="standard" badgeContent={notifications.length}
                               invisible={notifications.length < 1}>
                            <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                                <Notifications/>
                            </Avatar>
                        </Badge>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.notifications")}/>
                </ListItemButton>
            }
            {
                can("view", "challenges") &&
                <ListItemButton key={"challenges"} onClick={() => navigate("/challenges")} sx={{mt: 1}}>
                    <ListItemAvatar>
                        <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                            <EmojiEvents/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={t("browse.challenges")}/>
                </ListItemButton>
            }
            <ListItem key={"appVersion"} dense>
                <ListItemAvatar>
                    <Avatar sx={{background: "#88AEBF", width: 40, height: 40, borderRadius: 2}}>
                        <Info/>
                    </Avatar>
                </ListItemAvatar>
                <ListItemText sx={{overflow: "clip"}} primary={process.env.REACT_APP_VERSION} secondary={"Version"}/>
            </ListItem>
        </List>
    </Box>
}

export default withTranslation()(Browse);