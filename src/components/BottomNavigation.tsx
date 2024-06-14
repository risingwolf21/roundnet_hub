import {AdminPanelSettings, EmojiEvents, Liquor, List, SportsHandball} from "@mui/icons-material";
import {Badge, BottomNavigation, BottomNavigationAction, Paper} from "@mui/material";
import {TFunction} from "i18next";
import React, {SyntheticEvent, useEffect, useState} from "react";
import {withTranslation} from 'react-i18next';
import {useDispatch, useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {can} from "src/utils/PermissionService";
import {onModeChange} from "../redux/applicationSlice";
import {RootState} from "../redux/store";
import {notificationsSelector} from "../redux/notificationsSlice";
import {BOTTOM_NAV_OPTION_1, BOTTOM_NAV_OPTION_2, HOMEPAGE} from "../constants";
import {BottomNavigationItem} from "../types/types";

const CustomBottomNavigation = ({t}: { t: TFunction }) => {

    let navigate = useNavigate();
    let dispatch = useDispatch();
    const {hasNotVerifiedUsers} = useSelector((state: RootState) => state.adminUsers);
    const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));
    const {user} = useSelector((state: RootState) => state.application);
    const [tab, setTab] = useState<string>(HOMEPAGE);

    let bottomNavigation1: BottomNavigationItem = localStorage.getItem(BOTTOM_NAV_OPTION_1) as BottomNavigationItem ?? "training";
    let bottomNavigation2: BottomNavigationItem = localStorage.getItem(BOTTOM_NAV_OPTION_2) as BottomNavigationItem ?? "drinks";

    useEffect(() => {
        setTab(window.location.pathname.substring(1));
    }, [window.location.pathname]);

    const handleChange = (e: SyntheticEvent<Element, Event>, newValue: string) => {
        setTab(newValue);
        navigate(newValue, {replace: true});
        dispatch(onModeChange(newValue));
    }

    const drinks = () => <BottomNavigationAction
        key={"drinks"}
        value={"drinks"}
        aria-selected={tab === "drinks"}
        label={t("navigation.drinks")}
        icon={<Liquor/>}/>

    const training = () => <BottomNavigationAction
        key={"training"}
        value={"training"}
        aria-selected={tab === "training"}
        label={t("navigation.training")}
        icon={<SportsHandball/>}/>

    const challenges = () => <BottomNavigationAction
        key={"challenges"}
        value={"challenges"}
        aria-selected={tab === "challenges"}
        label={t("navigation.challenges")}
        icon={<EmojiEvents/>}/>

    if (!user)
        return null;

    return <Paper sx={{position: "fixed", bottom: 0, left: 0, right: 0}} elevation={3}>
        <BottomNavigation
            value={tab}
            onChange={handleChange}>
            {
                bottomNavigation1 === "training" && can("view", "training") && training()
            }
            {
                bottomNavigation1 === "drinks" && can("view", "drink") && drinks()
            }
            {
                bottomNavigation1 === "challenges" && can("view", "challenges") && challenges()
            }
            {
                bottomNavigation2 === "training" && can("view", "training") && training()
            }
            {
                bottomNavigation2 === "drinks" && can("view", "drink") && drinks()
            }
            {
                bottomNavigation2 === "challenges" && can("view", "challenges") && challenges()
            }
            {
                can("view", "browse") && <BottomNavigationAction
                    key={"browse"}
                    value={"browse"}
                    aria-selected={tab === "browse"}
                    label={t("navigation.browse")}
                    icon={<Badge color="secondary" variant="dot" badgeContent={" "}
                                 invisible={notifications.length < 1}>
                        <List/>
                    </Badge>}/>
            }
            {
                can("view", "browseAdmin") && <BottomNavigationAction
                    key={"admin"}
                    value={"browse-admin"}
                    aria-selected={tab === "browse-admin"}
                    label={t("navigation.admin")}
                    icon={<Badge color="secondary" variant="dot" badgeContent={" "}
                                 invisible={!hasNotVerifiedUsers}>
                        <AdminPanelSettings/>
                    </Badge>}/>
            }
        </BottomNavigation>
    </Paper>
}

export default withTranslation()(CustomBottomNavigation);