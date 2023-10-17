import React, { useContext, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { IconButton } from "@mui/material";
import { useNavigate } from 'react-router-dom';
import { AccountCircle, ArrowBack, Refresh } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { DependencyContext } from '..';
import { IEventRepository } from '../repository/IEventRepository';
import { RootState } from '../redux/store';

type Props = {
    navigateBack?: boolean,
    title?: string,
    onRefresh?: () => any
}

const CustomAppBar = ({ navigateBack = false, title = "Roundnet Karlsruhe", onRefresh }: Props) => {
    const navigate = useNavigate();
    const { container } = useContext(DependencyContext);
    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if (container)
            container.get<IEventRepository>("IEventRepository").test();
    }, [container]);

    return (<AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
        <Toolbar>
            {
                navigateBack && <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    <ArrowBack />
                </IconButton>
            }
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {title}
            </Typography>
            {
                user?.userId && <IconButton color="inherit" onClick={() => navigate("/user")}>
                    <AccountCircle />
                </IconButton>
            }
            {
                onRefresh && <IconButton color="inherit" onClick={onRefresh}>
                    <Refresh />
                </IconButton>
            }
        </Toolbar>
    </AppBar>)
}

export default CustomAppBar;