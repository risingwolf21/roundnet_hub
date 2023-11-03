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

export type Tab = {
    translationKey: string,
    path: string,
    index: number,
    icon: JSX.Element
}

const defaultTabs: Tab[] = [
    {
        translationKey: "drinks",
        path: "drinks",
        index: 0,
        icon: <Liquor />
    },
    // {
    //     translationKey: "training",
    //     path: "training",
    //     index: 1,
    //     icon: <SportsHandball />
    // },
    {
        translationKey: "browse",
        path: "browse",
        index: 2,
        icon: <List />
    }
];

const CustomBottomNavigation = ({ t }: { t: TFunction }) => {

    let navigate = useNavigate();
    let dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.application);
    const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);
    const [tabs, setTabs] = useState<Tab[]>(defaultTabs)

    useEffect(() => {
        setTab(tabs.findIndex(x => "/" + x.path === window?.location?.pathname));
    }, [tabs]);

    useEffect(() => {
        if (user.role !== "user") {
            setTabs([...defaultTabs, {
                translationKey: "admin",
                path: "browse-admin",
                index: 3,
                icon: <AdminPanelSettings />
            }])
        } else {
            setTabs(defaultTabs);
        }
    }, [user]);

    const [tab, setTab] = useState<number>(tabs.findIndex(x => "/" + x.path === window?.location?.pathname));

    const handleChange = (e: SyntheticEvent<Element, Event>, newValue: any) => {
        setTab(newValue);
        navigate(tabs[newValue].path, { replace: true });
        dispatch(onModeChange(tabs[newValue].path));
    }

    return <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
            showLabels
            value={tab}
            onChange={handleChange}>
            {
                tabs.map(x => {
                    return <BottomNavigationAction
                        key={x.translationKey}
                        label={t("navigation." + x.translationKey)}
                        icon={<Badge color="secondary" variant="dot" badgeContent=" " invisible={(x.translationKey !== "admin" || !hasNotVerifiedUsers)}>
                            {x.icon}
                        </Badge>} />
                })
            }
        </BottomNavigation>
    </Paper>
}

export default withTranslation()(CustomBottomNavigation);