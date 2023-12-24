import { AdminPanelSettings, Euro, Group, GroupOutlined, History, Liquor, ShowChart } from "@mui/icons-material";
import { Avatar, Badge, Box, List, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import { TFunction } from "i18next";
import React from "react";
import { withTranslation } from 'react-i18next';
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { UserRole } from "src/types/supabaseTypes";
import { Ability, Actions, can } from "src/utils/PermissionService";
import { RootState } from "../../redux/store";
import { AlertSnackbar } from "../AlertSnackbar";
import CustomAppBar from "../AppBar";

type EntryType = {
    translationKey: string
    navigateTo: string
    icon: React.ReactElement
    secondaryIcon: React.ReactElement
    role: UserRole
    avatarColor: string
    action: Actions
    ability: Ability[1]
}

const entries = [
    {
        translationKey: "managePayments",
        navigateTo: "/admin/drinks/payments",
        icon: <Euro />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "finance",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "payments"
    },
    {
        translationKey: "manageDrinks",
        navigateTo: "/admin/drinks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "drink"
    },
    {
        translationKey: "manageDrinkStocks",
        navigateTo: "/admin/drinks/stocks",
        icon: <Liquor />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "drink"
    },
    {
        translationKey: "analyzeDrinkStocks",
        navigateTo: "/admin/drinks/analyze",
        icon: <ShowChart />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "procure",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "drink"
    },
    {
        translationKey: "manageUsers",
        navigateTo: "/admin/users",
        icon: <Group />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "user"
    },
    {
        translationKey: "completeHistory",
        navigateTo: "/admin/drinks/history",
        icon: <History />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "admin",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "history"
    },
    {
        translationKey: "manageGroups",
        navigateTo: "/trainer/groups",
        icon: <GroupOutlined />,
        secondaryIcon: <AdminPanelSettings sx={{ color: "rgba(0,0,0,0.54)" }} />,
        role: "trainer",
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "groups"
    }
] as EntryType[];

const BrowseAdmin = ({ t }: { t: TFunction }) => {

    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.application);
    const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);

    if (!user)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. User was null!", severity: "error" }} />

    return <Box>
        <CustomAppBar />
        <List>
            {
                entries.filter(x => x.role === user.role || user.role === "admin")
                    .filter(x => can(x.action, x.ability)).map(x => {
                        return <ListItemButton key={x.translationKey} onClick={() => navigate(x.navigateTo)} sx={{ mt: 1 }}>
                            <ListItemAvatar>
                                <Badge color="secondary" variant="dot" badgeContent="  " invisible={(x.translationKey !== "manageUsers" || !hasNotVerifiedUsers)}>
                                    <Avatar sx={{ background: x.avatarColor, width: 40, height: 40, borderRadius: 2 }}>
                                        {x.icon}
                                    </Avatar>
                                </Badge>
                            </ListItemAvatar>
                            <ListItemText primary={t("browse." + x.translationKey)} />
                        </ListItemButton>
                    })
            }
        </List>
    </Box>
}

export default withTranslation()(BrowseAdmin);