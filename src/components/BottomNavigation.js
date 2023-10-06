import { Liquor, List, SportsHandball, AdminPanelSettings } from "@mui/icons-material"
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material"
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onModeChange } from "../redux/applicationSlice";
import { withTranslation } from 'react-i18next';
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const defaultTabs = [
    {
        translationKey: "drinks",
        path: "drinks",
        index: 0,
        icon: <Liquor />
    },
    {
        translationKey: "training",
        path: "training",
        index: 1,
        icon: <SportsHandball />
    },
    {
        translationKey: "browse",
        path: "browse",
        index: 2,
        icon: <List />
    }
];

const CustomBottomNavigation = ({ t }) => {

    let navigate = useNavigate();
    let dispatch = useDispatch();
    const { user } = useAuth();
    const [tabs, setTabs] = useState(defaultTabs)

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

    const [tab, setTab] = useState(tabs.findIndex(x => "/" + x.path === window?.location?.pathname));

    const handleChange = (event, newValue) => {
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
                tabs.map(x => <BottomNavigationAction key={x.translationKey} label={t("navigation." + x.translationKey)} icon={x.icon} />)
            }
        </BottomNavigation>
    </Paper>
}

export default withTranslation()(CustomBottomNavigation);