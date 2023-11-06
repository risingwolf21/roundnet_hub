import { Alert, AlertColor, Snackbar, SnackbarCloseReason } from "@mui/material"
import React, { SyntheticEvent } from "react"

export type AlertMessage = {
    message: string,
    severity: AlertColor
}

type AlertSnackbarProps = {
    close: () => void,
    alertInfo: AlertMessage | null
}

export const AlertSnackbar = ({ alertInfo, close }: AlertSnackbarProps) => {

    const handleSnackbarClose = (event: Event | SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        close();
    };

    const handleAlertClose = (event: SyntheticEvent<Element, Event>) => {
        close();
    }

    return <Snackbar sx={{ position: "fixed", right: "16px", bottom: "72px" }} open={alertInfo != null} onClose={handleSnackbarClose}>
        <Alert onClose={handleAlertClose} severity={alertInfo?.severity} sx={{ width: '100%' }}>
            {alertInfo?.message}
        </Alert>
    </Snackbar>
}