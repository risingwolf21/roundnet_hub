import React, {useEffect, useState} from "react";
import {FullKeyHistory} from "../../types/supabaseTypes";
import {SwipeableDialog} from "../SwipeableDialog";
import {captureException} from "@sentry/react";
import {Alert, List, ListItem, ListItemText} from "@mui/material";
import {format} from "date-fns";
import {LoadingIndicator} from "../LoadingIndicator";
import {SupabaseKeysRepository} from "../services/supabase/KeysRepository";

type KeyHistoryDialogProps = {
    open: boolean,
    handleClose: () => void,
    setOpen: (value: boolean) => void,
    keyId: number | null,
    keyName: string | null
}

export const KeyHistoryDialog = ({open, setOpen, handleClose, keyId, keyName}: KeyHistoryDialogProps) => {

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<FullKeyHistory[]>([])

    useEffect(() => {
        if (!keyId)
            return;

        setHistory([]);
        setLoading(true);
        SupabaseKeysRepository.loadKeyHistory(keyId).then(result => {
            setHistory(result.data ?? []);
        }).catch(error => {
            captureException(error);
            setError(error.message);
        }).finally(() => {
            setLoading(false);
        });
    }, [keyId, keyName]);

    return <SwipeableDialog open={open} setOpen={setOpen} onClose={handleClose}
                            title={"Schlüssel Historie - " + keyName}>
        {
            error && <Alert sx={{mt: 2}} severity="error">
                {"Could not load key history: " + error}
            </Alert>
        }
        {
            !loading && history.length === 0 && <Alert sx={{m: 2}} severity={"info"}>
                Es ist keine Historie vorhanden!
            </Alert>
        }
        <LoadingIndicator loading={loading}/>
        <List sx={{maxHeight: "80%", overflow: "auto"}}>
            {
                history.map(x => <ListItem key={x.id} divider>
                    <ListItemText primary={`${x.pastUser.displayName} ➔ ${x.currentUser.displayName}`}
                                  secondary={format(x.created_at, "dd.MM.yyyy HH:mm")}/>
                </ListItem>)
            }
        </List>

    </SwipeableDialog>
}