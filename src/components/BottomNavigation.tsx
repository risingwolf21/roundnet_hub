import { Liquor, List, SportsHandball, AdminPanelSettings } from "@mui/icons-material"
import { Badge, BottomNavigation, BottomNavigationAction, Paper } from "@mui/material"
import { SyntheticEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onModeChange } from "../redux/applicationSlice";
import { withTranslation } from 'react-i18next';
import React, { useEffect } from "react";
import { TFunction } from "i18next";
import { RootState } from "../redux/store";
import { Ability, Can, useAppAbility } from "src/utils/PermissionService";

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
    const { can } = useAppAbility();
    const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);
    const [tabs, setTabs] = useState<Tab[]>(defaultTabs)

    useEffect(() => {
        setTab(window?.location?.pathname);
    }, [tabs]);

    const [tab, setTab] = useState<string>(window?.location?.pathname);

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