import { AccountCircle, AdminPanelSettings, Euro, Group, History, Liquor } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

const entries = [
    {
        title: "Zahlungen verwalten",
        navigateTo: "/admin/drinks/payments",
        icon: <Euro />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "finance"
    },
    {
        title: "Getränke verwalten",
        navigateTo: "/admin/drinks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure"
    },
    {
        title: "Benutzer verwalten",
        navigateTo: "/admin/users",
        icon: <Group />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin"
    },
    {
        title: "Verlauf",
        navigateTo: "/admin/drinks/history",
        icon: <History />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin"
    }
]

const Browse = () => {

    const navigate = useNavigate();
    const { user } = useAuth();

    return <List>
        {
            [
                {
                    title: "Account",
                    navigateTo: "/user",
                    icon: <AccountCircle />
                },
                {
                    title: "Payment",
                    navigateTo: "/payments",
                    icon: <Euro />
                },
                {
                    title: "History",
                    navigateTo: "/history",
                    icon: <History />
                },
                ...entries.filter(x => x.role === user.role || user.role === "admin"),
            ].map(x => {
                return <ListItem onClick={() => navigate(x.navigateTo)} focusRipple sx={{ mt: 1 }}>
                    <ListItemAvatar>
                        <Avatar sx={{ width: 40, height: 40 }}>
                            {x.icon}
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={x.title} />
                    {
                        x.secondaryIcon && <ListItemSecondaryAction>
                            {x.secondaryIcon}
                        </ListItemSecondaryAction>
                    }
                </ListItem>
            })
        }
    </List>
}

export default Browse;