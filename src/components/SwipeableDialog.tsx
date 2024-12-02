import {Close} from "@mui/icons-material";
import {Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Toolbar, Typography} from "@mui/material"
import React from "react";


type SwipeableDialogProps = {
    open: boolean,
    setOpen?: (value: boolean) => void,
    onClose?: () => void,
    children: React.ReactNode,
    actions?: React.ReactNode,
    title: string,
    minHeight?: number
}

export const SwipeableDialog = ({
                                    open,
                                    onClose,
                                    children,
                                    actions,
                                    title = "",
                                    minHeight = 40
                                }: SwipeableDialogProps) => {

    const handleClose = () => {
        if (onClose) onClose();
    }

    return <Dialog open={open} onClose={onClose} scroll={"paper"}
                   sx={{
                       '.MuiDialog-container > .MuiPaper-root': {
                           m: 0,
                           maxHeight: "75vh",
                           minHeight: `${minHeight}vh`,
                           width: "100%",
                           borderTopLeftRadius: 16,
                           borderTopRightRadius: 16,
                       },
                       '.MuiDialog-container': {
                           position: "absolute",
                           m: 0,
                           left: 0,
                           right: 0,
                           bottom: 0,
                           top: 0,
                           height: "100vh",
                           width: "100%",
                           alignItems: "end"
                       }
                   }}>
        <DialogTitle sx={{p: 0}}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="close drawer"
                    onClick={handleClose}
                    edge="start"
                    sx={{mr: 2}}>
                    <Close/>
                </IconButton>
                <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                    {title}
                </Typography>
            </Toolbar>
        </DialogTitle>
        <DialogContent sx={{p: 0}}>
            {children}
        </DialogContent>
        {
            actions && <DialogActions>
                {actions}
            </DialogActions>
        }
    </Dialog>
}