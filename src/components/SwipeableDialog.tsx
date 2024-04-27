import {Global} from "@emotion/react";
import {Close} from "@mui/icons-material";
import {Box, CssBaseline, IconButton, styled, SwipeableDrawer, Toolbar, Typography} from "@mui/material"
import {grey} from "@mui/material/colors";
import React from "react";

const drawerBleeding = 56;

const Root = styled('div')(({ theme }) => ({
    height: '100%',
    backgroundColor:
        theme.palette.mode === 'light' ? grey[100] : theme.palette.background.default,
}));

const StyledBox = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'light' ? '#fff' : grey[800],
}));

type SwipeableDialogProps = {
    open: boolean,
    setOpen: (value: boolean) => void,
    onClose?: () => void,
    children: any,
    title: string,
    minHeight?: number
}

export const SwipeableDialog = ({ open, setOpen, onClose, children, title = "", minHeight = 40 }: SwipeableDialogProps) => {

    const toggleDrawer = (newOpen: boolean) => () => {
        setOpen(newOpen);
    };

    const handleClose = () => {
        toggleDrawer(false);
        if (onClose) onClose();
    }

    return <Root>
        <CssBaseline />
        <Global
            styles={{
                '.MuiDrawer-root > .MuiPaper-root': {
                    overflow: 'visible',
                    maxHeight: `90%`,
                    minHeight: `${minHeight}%`,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                },
            }}
        />
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={handleClose}
            onOpen={toggleDrawer(true)}
            swipeAreaWidth={drawerBleeding}
            disableSwipeToOpen={true}
            ModalProps={{
                keepMounted: true,
            }}>
            <StyledBox
                sx={{
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    visibility: open ? 'visible' : 'invisible',
                }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="close drawer"
                        onClick={handleClose}
                        edge="start"
                        sx={{ mr: 2 }}>
                        <Close />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title}
                    </Typography>
                </Toolbar>
            </StyledBox>
            <StyledBox
                sx={{
                    height: '100%',
                    overflow: 'auto',
                }}>
                {children}
            </StyledBox>
        </SwipeableDrawer>
    </Root>
}