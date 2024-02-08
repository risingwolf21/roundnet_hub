import { AccountCircle, Euro, History, Info, Key, Notifications } from "@mui/icons-material";
import { Avatar, Box, List, ListItem, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import { TFunction } from "i18next";
import React, { ReactElement } from "react";
import { withTranslation } from 'react-i18next';
import { useNavigate } from "react-router";
import { Ability, can } from "src/utils/PermissionService";
import CustomAppBar from "./AppBar";
import OneSignal from "react-onesignal";

type TabsType = {
    translationKey: string
    navigateTo: string
    icon: ReactElement
    avatarColor: string
    ability: Ability[1]
}

const tabs = [
    {
        translationKey: "account",
        navigateTo: "/user",
        icon: <AccountCircle />,
        avatarColor: "#88AEBF",
        ability: "user"
    },
    {
        translationKey: "payment",
        navigateTo: "/payments",
        icon: <Euro />,
        avatarColor: "#88AEBF",
        ability: "payments"
    },
    {
        translationKey: "history",
        navigateTo: "/history",
        icon: <History />,
        avatarColor: "#88AEBF",
        ability: "history"
    },
    {
        translationKey: "keys",
        navigateTo: "/keys",
        icon: <Key />,
        avatarColor: "#88AEBF",
        ability: "keyFinder"
    },
    {
        translationKey: "notifications",
        navigateTo: "/notifications",
        icon: <Notifications />,
        avatarColor: "#88AEBF",
        ability: "notifications"
    }
] as TabsType[];

const Browse = ({ t }: { t: TFunction }) => {

    const navigate = useNavigate();

    return <Box>
        <CustomAppBar />
        <List>
            {
                tabs.filter(x => can("view", x.ability)).map(x => {
                    return <ListItemButton key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                        <ListItemAvatar>
                            <Avatar sx={{ background: x.avatarColor, width: 40, height: 40, borderRadius: 2 }}>
                                {x.icon}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={t("browse." + x.translationKey)} />
                    </ListItemButton>
                })
            }
            <ListItem key={"appVersion"} dense>
                <ListItemAvatar>
                    <Avatar sx={{ background: "#88AEBF", width: 40, height: 40, borderRadius: 2 }}>
                        <Info />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText sx={{ overflow: "clip" }} primary={process.env.REACT_APP_VERSION} secondary={"Version"} />
            </ListItem>
        </List>
    </Box>
}

export default withTranslation()(Browse);