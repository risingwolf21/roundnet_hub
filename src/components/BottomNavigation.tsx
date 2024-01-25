import { AdminPanelSettings, Liquor, List, SportsHandball } from "@mui/icons-material";
import { Badge, BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { TFunction } from "i18next";
import React, { SyntheticEvent, useState } from "react";
import { withTranslation } from 'react-i18next';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Ability, can } from "src/utils/PermissionService";
import { onModeChange } from "../redux/applicationSlice";
import { RootState } from "../redux/store";

export type Tab = {
    translationKey: string,
    path: string,
    index: number,
    icon: JSX.Element,
    ability: Ability[1]
}

const defaultTabs: Tab[] = [
    {
        translationKey: "drinks",
        path: "drinks",
        index: 0,
        icon: <Liquor />,
        ability: "drink"
    },
    {
        translationKey: "training",
        path: "training",
        index: 1,
        icon: <SportsHandball />,
        ability: "training"
    },
    {
        translationKey: "browse",
        path: "browse",
        index: 2,
        icon: <List />,
        ability: "browse"
    },
    {
        translationKey: "admin",
        path: "browse-admin",
        index: 3,
        icon: <AdminPanelSettings />,
        ability: "browseAdmin"
    }
];

const CustomBottomNavigation = ({ t }: { t: TFunction }) => {

    let navigate = useNavigate();
    let dispatch = useDispatch();
    const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);
    const [tab, setTab] = useState<string>("drinks");

    const handleChange = (e: SyntheticEvent<Element, Event>, newValue: string) => {
        setTab(newValue);
        navigate(newValue, { replace: true });
        dispatch(onModeChange(newValue));
    }

    return <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
            showLabels
            value={tab}
            onChange={handleChange}>
            {
                defaultTabs.filter(x => can("view", x.ability)).map(x => {
                    return <BottomNavigationAction
                        key={x.path}
                        value={x.path}
                        aria-selected={tab === x.path}
                        label={t("navigation." + x.translationKey)}
                        icon={<Badge color="secondary" variant="dot" badgeContent=" " invisible={!(x.translationKey === "admin" && hasNotVerifiedUsers)}>
                            {x.icon}
                        </Badge>} />
                })
            }
        </BottomNavigation>
    </Paper>
}

export default withTranslation()(CustomBottomNavigation);