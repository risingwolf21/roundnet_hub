import { AccountCircle, AdminPanelSettings, Euro, Group, History, Liquor } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

const entries = [
    {
        title: "Account",
        navigateTo: "/user",
        icon: <AccountCircle />,
        admin: false
    },
    {
        title: "Payment",
        navigateTo: "/payments",
        icon: <Euro />,
        admin: false
    },
    {
        title: "History",
        navigateTo: "/history",
        icon: <History />,
        admin: false
    },
    {
        title: "Zahlungen verwalten",
        navigateTo: "/admin/drinks/payments",
        icon: <Euro />,
        secondaryIcon: <AdminPanelSettings />,
        admin: true
    },
    {
        title: "Getränke verwalten",
        navigateTo: "/admin/drinks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings />,
        admin: true
    },
    {
        title: "Benutzer verwalten",
        navigateTo: "/admin/users",
        icon: <Group />,
        secondaryIcon: <AdminPanelSettings />,
        admin: true
    },
    {
        title: "Verlauf",
        navigateTo: "/admin/drinks/history",
        icon: <History />,
        secondaryIcon: <AdminPanelSettings />,
        admin: true
    }
]

const Browse = () => {

    const navigate = useNavigate();
    const { user } = useAuth();

    return <List>
        {
            entries.filter(x => x.admin || user.role === "admin").map(x => {
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