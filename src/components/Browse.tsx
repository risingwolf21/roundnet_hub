import { AccountCircle, Euro, History, Info, SportsHandball } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Box } from "@mui/material";
import { useNavigate } from "react-router";
import { withTranslation } from 'react-i18next';
import CustomAppBar from "./AppBar";
import { useSelector } from "react-redux";
import { TFunction } from "i18next";
import React from "react";
import { RootState } from "../redux/store";

const tabs = [
    {
        translationKey: "account",
        navigateTo: "/user",
        icon: <AccountCircle />,
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "payment",
        navigateTo: "/payments",
        icon: <Euro />,
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "history",
        navigateTo: "/history",
        icon: <History />,
        avatarColor: "#88AEBF"
    },
    // {
    //     translationKey: "training",
    //     navigateTo: "/training",
    //     icon: <SportsHandball />,
    //     avatarColor: "#88AEBF"
    // },
]

const Browse = ({ t }: { t: TFunction }) => {

    const navigate = useNavigate();
    const appVersion = useSelector((state: RootState) => state.application.appVersion)

    return <Box>
        <CustomAppBar />
        <List>
            {
                tabs.map(x => {
                    return <ListItem key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                        <ListItemAvatar>
                            <Avatar sx={{ background: x.avatarColor, width: 40, height: 40 }}>
                                {x.icon}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={t("browse." + x.translationKey)} />
                    </ListItem>
                })
            }
            <ListItem dense>
                <ListItemAvatar>
                    <Avatar sx={{ background: "#88AEBF", width: 40, height: 40 }}>
                        <Info />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText sx={{ overflow: "clip" }} primary={appVersion} secondary={"Version"} />
            </ListItem>
        </List>
    </Box>
}

export default withTranslation()(Browse);