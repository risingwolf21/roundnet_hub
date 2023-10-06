import { AccountCircle, Euro, History, Info, SportsHandball } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Box } from "@mui/material";
import { useNavigate } from "react-router";
import { withTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import raw from "../git_commit.txt";
import CustomAppBar from "./AppBar";

const Browse = ({ t }) => {

    const navigate = useNavigate();
    const [version, setVersion] = useState();

    useEffect(() => {
        fetch(raw)
            .then(r => r.text())
            .then(text => {
                setVersion(text);
            });
    })

    return <Box>
        <CustomAppBar />
        <List>
            {
                [
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
                    {
                        translationKey: "training",
                        navigateTo: "/training",
                        icon: <SportsHandball />,
                        avatarColor: "#88AEBF"
                    },
                ].map(x => {
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
                <ListItemText sx={{ overflow: "clip" }} primary={version} secondary={"Version"} />
            </ListItem>
        </List>
    </Box>
}

export default withTranslation()(Browse);