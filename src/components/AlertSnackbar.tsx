import { Alert, AlertColor, Snackbar, SnackbarCloseReason } from "@mui/material"
import React, { SyntheticEvent } from "react"

export type AlertMessage = {
    message: string,
    severity: AlertColor
}

type AlertSnackbarProps = {
    close?: (() => void) | null,
    alertInfo: AlertMessage | null,
    autoHideDuration?: number | null
}

export const AlertSnackbar = ({ alertInfo, close, autoHideDuration }: AlertSnackbarProps) => {

    const handleSnackbarClose = (event: Event | SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        close && close();
    };

    const handleAlertClose = (_: SyntheticEvent<Element, Event>) => {
        close && close();
    }

    return <Snackbar sx={{ position: "fixed", right: "16px", bottom: "72px" }} open={alertInfo != null} autoHideDuration={autoHideDuration} onClose={close ? handleSnackbarClose : undefined}>
        <Alert onClose={close ? handleAlertClose : undefined} severity={alertInfo?.severity} sx={{ width: '100%' }}>
            {alertInfo?.message}
        </Alert>
    </Snackbar>
}