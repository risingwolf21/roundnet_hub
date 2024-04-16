import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import {Avatar, Button, IconButton} from "@mui/material";
import {useNavigate} from 'react-router-dom';
import {AccountCircle, ArrowBack, Refresh} from '@mui/icons-material';
import {useSelector} from 'react-redux';
import {RootState} from '../redux/store';

type Props = {
    navigateBack?: boolean,
    title?: string,
    onRefresh?: () => any,
    onLogout?: () => any,
    actions?: JSX.Element[]
}

export const AppBarLogoutAction = ({
                                       click, isVisible
                                   }: { click?: () => any, isVisible?: boolean }) => {
    if (click && isVisible) {
        return <Button variant='contained' sx={{color: (theme) => theme.palette.primary.main, background: "#fff"}}
                       onClick={click}>
            Logout
        </Button>
    }
    return null;
}

export const AppBarAccountAction = ({
                                        click, isVisible, profileUrl
                                    }: {
    click?: () => any,
    isVisible?: boolean,
    profileUrl: string | null | undefined
}) => {
    if (click && isVisible) {
        return <IconButton color="inherit" onClick={click} sx={{pr: 0}}>
            {
                profileUrl
                    ? <Avatar sx={{borderRadius: 2, width: "35px", height: "35px"}}>
                        <img src={profileUrl} alt="logo"
                             width={"35px"}
                             height={"35px"}/>
                    </Avatar>
                    : <AccountCircle/>
            }
        </IconButton>
    }
    return null;
}

export const AppBarRefreshAction = ({
                                        click, isVisible
                                    }: { click?: () => any, isVisible?: boolean }) => {
    if (click && isVisible) {
        return <IconButton color="inherit" onClick={click}>
            <Refresh/>
        </IconButton>
    }
    return null;
}

const CustomAppBar = ({navigateBack = false, title = "Roundnet Karlsruhe", onRefresh, onLogout, actions}: Props) => {
    const navigate = useNavigate();
    const {user} = useSelector((state: RootState) => state.application);

    return (<AppBar position="sticky" sx={{zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary"}}>
        <Toolbar>
            {
                navigateBack && <IconButton
                    color="inherit"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{mr: 2}}>
                    <ArrowBack/>
                </IconButton>
            }
            <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                {title}
            </Typography>

            <AppBarAccountAction click={() => navigate("/user")} profileUrl={user?.avatarUrl}
                                 isVisible={user?.userId !== undefined && onLogout === undefined}/>

            <AppBarLogoutAction click={onLogout} isVisible={onLogout !== undefined}/>

            <AppBarRefreshAction click={onRefresh} isVisible={onRefresh !== undefined}/>

            {
                actions
            }
        </Toolbar>
    </AppBar>)
}

export default CustomAppBar;