import {
    alpha,
    Box,
    BoxProps,
    Divider,
    Drawer as MaterialDrawer,
    DrawerProps,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemProps,
    ListItemText,
    ListSubheader
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {EmojiEvents, Euro, History, Key, Liquor, Person, Scoreboard, SportsHandball} from "@mui/icons-material";
import {styled} from "@mui/system";
import {HOMEPAGE} from "../constants";
import {useNavigate} from "react-router-dom";
import {can, canAny} from "../utils/PermissionService";
import {useTranslation} from "react-i18next";

type Props = {
    open: boolean,
    onClose: () => void;
}

const DrawerItem = styled(ListItem)<ListItemProps>(({theme}) => ({
    borderRadius: 28,
    height: 56,
    marginRight: 12,
    marginLeft: 12,
    width: "unset",
    "& .Mui-selected": {
        backgroundColor: `${alpha(theme.palette.secondary.main, 0.16)}`
    },
    "& .Mui-focusVisible": {
        backgroundColor: `${alpha(theme.palette.secondary.main, 0.16)}`
    },
    ":hover": {
        backgroundColor: `${alpha(theme.palette.secondary.main, 0.16)}`
    },
    "& .MuiListItemSecondaryAction-root": {
        right: 24
    },
    "& .MuiListItemAvatar-root": {
        display: "flex",
        width: "28px",
        height: "28px",
        marginRight: "12px",
        minWidth: "unset"
    },
    "& .MuiListItemIcon-root": {
        alignItems: "center"
    }
}));

const DrawerBox = styled(Box)<BoxProps>(({theme}) => ({
    width: 360,
    height: "100%",
}));

const CustomDrawer = styled(MaterialDrawer)<DrawerProps>(({theme}) => ({
    '& .MuiPaper-root': {
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        background: "#f2ecf1",
        color: "#49454e"
    }
}));

export const Drawer = ({open, onClose}: Props) => {
    const navigate = useNavigate();
    const {t} = useTranslation();
    const [tab, setTab] = useState<string>(HOMEPAGE);

    useEffect(() => {
        setTab(window.location.pathname.substring(1));
    }, [window.location.pathname]);

    const handleChange = (newValue: string) => {
        setTab(newValue);
        navigate('/' + newValue);
    };

    return <CustomDrawer open={open} onClose={onClose}>
        <DrawerBox role="presentation">
            <List>
                <DrawerItem selected={true} onClick={() => handleChange("account")}>
                    <ListItemAvatar>
                        <ListItemIcon>
                            <Person/>
                        </ListItemIcon>
                    </ListItemAvatar>
                    <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "0.9rem"}}
                                  primary={"Account"}/>
                </DrawerItem>
            </List>
            <Divider/>
            {canAny('select', ['drink', 'history']) && (<>
                    <List subheader={<ListSubheader
                        sx={{
                            zIndex: '-1',
                            fontWeight: 'bold',
                            lineHeight: 'normal',
                            my: 2,
                            mx: 2,
                            backgroundColor: "#f2ecf1"
                        }}>
                        {t("navigation.drinks")}
                    </ListSubheader>}>
                        {
                            can('select', 'drink') && (
                                <DrawerItem onClick={() => handleChange("drinks")}>
                                    <ListItemAvatar>
                                        <ListItemIcon>
                                            <Liquor/>
                                        </ListItemIcon>
                                    </ListItemAvatar>
                                    <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "0.9rem"}}
                                                  primary={t("navigation.drinks")}/>
                                </DrawerItem>
                            )
                        }
                        {
                            can('select', 'history') && (
                                <DrawerItem onClick={() => handleChange("history")}>
                                    <ListItemAvatar>
                                        <ListItemIcon>
                                            <History/>
                                        </ListItemIcon>
                                    </ListItemAvatar>
                                    <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "0.9rem"}}
                                                  primary={t("browse.history")}/>
                                </DrawerItem>
                            )
                        }
                        {
                            can('select', 'payments') && (
                                <DrawerItem onClick={() => handleChange("payments")}>
                                    <ListItemAvatar>
                                        <ListItemIcon>
                                            <Euro/>
                                        </ListItemIcon>
                                    </ListItemAvatar>
                                    <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "0.9rem"}}
                                                  primary={t("browse.payment")}/>
                                </DrawerItem>
                            )
                        }
                    </List>
                    <Divider/>
                </>
            )}

            <List>
                {[
                    {text: "Training", icon: <SportsHandball/>},
                    {text: "Challenges", icon: <EmojiEvents/>},
                    {text: "Schlüssel", icon: <Key/>},
                    {text: "Spiele", icon: <Scoreboard/>}].map(({text, icon}, index) => (
                    <DrawerItem>
                        <ListItemAvatar sx={{width: "28px", height: "28px", mr: "12px", minWidth: "unset"}}>
                            <ListItemIcon>
                                {icon}
                            </ListItemIcon>
                        </ListItemAvatar>
                        <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "0.9rem"}} primary={text}/>
                    </DrawerItem>
                ))}
            </List>
        </DrawerBox>
    </CustomDrawer>
}