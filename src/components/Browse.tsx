import { AccountCircle, Euro, History, Info, Key, Notifications } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Box } from "@mui/material";
import { useNavigate } from "react-router";
import { withTranslation } from 'react-i18next';
import CustomAppBar from "./AppBar";
import { TFunction } from "i18next";
import React, { ReactElement } from "react";
import { Ability, Can } from "src/utils/PermissionService";

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
                tabs.map(x => {
                    return <Can I="view" an={x.ability}>
                        <ListItem key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                            <ListItemAvatar>
                                <Avatar sx={{ background: x.avatarColor, width: 40, height: 40, borderRadius: 2 }}>
                                    {x.icon}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={t("browse." + x.translationKey)} />
                        </ListItem>
                    </Can>
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