import {Euro, Group, GroupOutlined, History, Liquor, StorageOutlined} from "@mui/icons-material";
import {Avatar, Badge, List, ListItemAvatar, ListItemButton, ListItemText} from "@mui/material";
import {TFunction} from "i18next";
import React from "react";
import {withTranslation} from 'react-i18next';
import {useSelector} from "react-redux";
import {useNavigate} from "react-router";
import {Ability, Actions, can} from "src/utils/PermissionService";
import {RootState} from "../../redux/store";
import {AlertSnackbar} from "../../components/AlertSnackbar";
import Layout from "../../components/Layout";

type EntryType = {
    translationKey: string
    navigateTo: string
    icon: React.ReactElement
    avatarColor: string
    action: Actions
    ability: Ability[1]
}

const entries = [
    {
        translationKey: "managePayments",
        navigateTo: "/admin/drinks/payments",
        icon: <Euro/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "payments"
    },
    {
        translationKey: "manageDrinks",
        navigateTo: "/admin/drinks",
        icon: <Liquor/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "drink"
    },
    {
        translationKey: "manageUsers",
        navigateTo: "/admin/users",
        icon: <Group/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "user"
    },
    {
        translationKey: "completeHistory",
        navigateTo: "/admin/drinks/history",
        icon: <History/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "history"
    },
    {
        translationKey: "manageGroups",
        navigateTo: "/trainer/groups",
        icon: <GroupOutlined/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "groups"
    },
    {
        translationKey: "postgresClient",
        navigateTo: "/admin/supabase",
        icon: <StorageOutlined/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "edgeFunctions"
    },
    {
        translationKey: "supabaseQueries",
        navigateTo: "/admin/supabase/queries",
        icon: <StorageOutlined/>,
        avatarColor: "#88AEBF",
        action: "edit",
        ability: "edgeFunctions"
    }
] as EntryType[];

const BrowseAdmin = ({t}: { t: TFunction }) => {

    const navigate = useNavigate();
    const {user} = useSelector((state: RootState) => state.application);
    const {hasNotVerifiedUsers} = useSelector((state: RootState) => state.adminUsers);

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. User was null!", severity: "error"}}/>

    return <Layout>
        <List>
            {
                entries
                    .filter(x => can(x.action, x.ability)).map(x => {
                    return <ListItemButton key={x.translationKey} onClick={() => navigate(x.navigateTo)}
                                           sx={{mt: 1}}>
                        <ListItemAvatar>
                            <Badge color="secondary" variant="dot" badgeContent="  "
                                   invisible={(x.translationKey !== "manageUsers" || !hasNotVerifiedUsers)}>
                                <Avatar sx={{background: x.avatarColor, width: 40, height: 40, borderRadius: 2}}>
                                    {x.icon}
                                </Avatar>
                            </Badge>
                        </ListItemAvatar>
                        <ListItemText primary={t("browse." + x.translationKey)}/>
                    </ListItemButton>
                })
            }
        </List>
    </Layout>
}

export default withTranslation()(BrowseAdmin);