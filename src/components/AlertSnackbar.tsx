import { Alert, AlertColor, Snackbar, SnackbarCloseReason } from "@mui/material"
import React, { SyntheticEvent } from "react"

export type AlertMessage = {
    message: string,
    severity: AlertColor
}

type AlertSnackbarProps = {
    open: boolean,
    onClose: () => void,
    alertInfo: AlertMessage
}

export const AlertSnackbar = ({ open, onClose, alertInfo }: AlertSnackbarProps) => {

    const handleSnackbarClose = (event: Event | SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        onClose();
    };

    const handleAlertClose = (event: SyntheticEvent<Element, Event>) => {
        onClose();
    }

    return <Snackbar sx={{ position: "fixed", right: "16px", bottom: "72px" }} open={open} onClose={handleSnackbarClose}>
        <Alert onClose={handleAlertClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
            {alertInfo.message}
        </Alert>
    </Snackbar>
}