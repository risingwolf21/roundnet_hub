import { AccountCircle, AdminPanelSettings, Euro, Group, History, Liquor, Info } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Box } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { withTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import raw from "../git_commit.txt";
import CustomAppBar from "./AppBar";

const entries = [
    {
        translationKey: "managePayments",
        navigateTo: "/admin/drinks/payments",
        icon: <Euro />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "finance",
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "manageDrinks",
        navigateTo: "/admin/drinks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure",
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "manageUsers",
        navigateTo: "/admin/users",
        icon: <Group />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin",
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "completeHistory",
        navigateTo: "/admin/drinks/history",
        icon: <History />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin",
        avatarColor: "#88AEBF"
    }
]

const Browse = ({ t }) => {

    const navigate = useNavigate();
    const { user } = useAuth();

    const [version, setVersion] = useState();

    useEffect(() => {
        fetch(raw)
            .then(r => r.text())
            .then(text => {
                setVersion(text);
            });
    })

    return <Box container>
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
                    // {
                    //     translationKey: "training",
                    //     navigateTo: "/training",
                    //     icon: <SportsHandball />,
                    //     avatarColor: "#88AEBF"
                    // },
                    ...entries.filter(x => x.role === user.role || user.role === "admin"),
                ].map(x => {
                    return <ListItem key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                        <ListItemAvatar>
                            <Avatar sx={{ background: x.avatarColor, width: 40, height: 40 }}>
                                {x.icon}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={t("browse." + x.translationKey)} />
                        {
                            x.secondaryIcon && <ListItemSecondaryAction>
                                {x.secondaryIcon}
                            </ListItemSecondaryAction>
                        }
                    </ListItem>
                })
            }
            <ListItem dense>
                <ListItemAvatar>
                    <Avatar sx={{ background: "#88AEBF", width: 40, height: 40 }}>
                        <Info />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText primary={version} secondary={"Version"} />
            </ListItem>
        </List>
    </Box>
}

export default withTranslation()(Browse);