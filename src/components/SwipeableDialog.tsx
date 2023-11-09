import { Global } from "@emotion/react";
import { Close } from "@mui/icons-material";
import { Box, CssBaseline, IconButton, Skeleton, SwipeableDrawer, Toolbar, Typography, styled } from "@mui/material"
import { grey } from "@mui/material/colors";
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

const Puller = styled(Box)(({ theme }) => ({
    width: 30,
    height: 6,
    backgroundColor: theme.palette.mode === 'light' ? grey[300] : grey[900],
    borderRadius: 3,
    position: 'absolute',
    top: 8,
    left: 'calc(50% - 15px)',
}));

type SwipeableDialogProps = {
    open: boolean,
    setOpen: (value: boolean) => void,
    children: any
}

export const SwipeableDialog = ({ open, setOpen, children }: SwipeableDialogProps) => {

    const toggleDrawer = (newOpen: boolean) => () => {
        setOpen(newOpen);
    };

    return <Root>
        <CssBaseline />
        <Global
            styles={{
                '.MuiDrawer-root > .MuiPaper-root': {
                    overflow: 'visible',
                    maxHeight: `90%`,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                },
            }}
        />
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={toggleDrawer(false)}
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
                    visibility: 'visible',
                }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={() => setOpen(false)}
                        edge="start"
                        sx={{ mr: 2 }}>
                        <Close />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        asdf
                    </Typography>
                </Toolbar>
            </StyledBox>
            <StyledBox
                sx={{
                    px: 2,
                    pb: 2,
                    height: '100%',
                    overflow: 'auto',
                }}>
                {children}
            </StyledBox>
        </SwipeableDrawer>
    </Root>
}