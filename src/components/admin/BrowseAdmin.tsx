import { AdminPanelSettings, Euro, Group, History, Liquor, GroupOutlined, ShowChart, LinkOff, Link, RunningWithErrors, CrisisAlert } from "@mui/icons-material";
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Box, Badge } from "@mui/material";
import { useNavigate } from "react-router";
import { withTranslation } from 'react-i18next';
import CustomAppBar from "../AppBar";
import { useSelector } from "react-redux";
import React from "react";
import { RootState } from "../../redux/store";
import { TFunction } from "i18next";

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
        translationKey: "manageDrinkStocks",
        navigateTo: "/admin/drinks/stocks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure",
        avatarColor: "#88AEBF"
    },
    {
        translationKey: "analyzeDrinkStocks",
        navigateTo: "/admin/drinks/analyze",
        icon: <ShowChart />,
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
    },
    {
        translationKey: "manageGroups",
        navigateTo: "/trainer/groups",
        icon: <GroupOutlined />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "trainer",
        avatarColor: "#88AEBF"
    }
]

const BrowseAdmin = ({ t }: { t: TFunction }) => {

    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.application);
    const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);

    return <Box>
        <CustomAppBar />
        <List>
            {
                [
                    ...[
                        ...entries.filter(x => x.role === user.role || user.role === "admin"),
                    ].map(x => {
                        return <ListItem key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                            <ListItemAvatar>
                                <Badge color="secondary" variant="dot" badgeContent="  " invisible={(x.translationKey !== "manageUsers" || !hasNotVerifiedUsers)}>
                                    <Avatar sx={{ background: x.avatarColor, width: 40, height: 40, borderRadius: 2 }}>
                                        {x.icon}
                                    </Avatar>
                                </Badge>
                            </ListItemAvatar>
                            <ListItemText primary={t("browse." + x.translationKey)} />
                        </ListItem>
                    })
                ]
            }
        </List>
    </Box>
}

export default withTranslation()(BrowseAdmin);