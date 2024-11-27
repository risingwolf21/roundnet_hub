import {
    Avatar,
    Button,
    IconButton,
    ListItemAvatar,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import EditIcon from "@mui/icons-material/Edit";
import React from "react";
import {FullItemHolder} from "../../../types/supabaseTypes";
import {TFunction} from "i18next";

type ItemHolderItemProsp = {
    x: FullItemHolder,
    t: TFunction,
    user: User,
    isEditingMode: boolean,
    setItemToEdit: (value: FullItemHolder) => void,
    setAddOrUpdateKeysOpen: (value: boolean) => void,
    setItemHistoryDialogOpen: (value: boolean) => void,
    selectKeyToHandOver: (value: FullItemHolder) => void,
    selectKeyToReceive: (value: FullItemHolder) => void,
}

export const ItemHolderItem = ({
                                   x,
                                   t,
                                   user,
                                   isEditingMode,
                                   setItemToEdit,
                                   setAddOrUpdateKeysOpen,
                                   setItemHistoryDialogOpen,
                                   selectKeyToHandOver,
                                   selectKeyToReceive
                               }: ItemHolderItemProsp) => {
    return <ListItemButton key={x.id} divider
                           onClick={() => {
                               setItemToEdit(x);
                               setItemHistoryDialogOpen(true);
                           }}>
        <ListItemAvatar>
            <Avatar sx={{background: x.color, width: 40, height: 40, borderRadius: 2}}>
                <KeyIcon/>
            </Avatar>
        </ListItemAvatar>
        <ListItemText primary={x.current_holder?.displayName ?? "Nicht zugewiesen"} secondary={x.name}/>
        {
            isEditingMode
                ? <ListItemSecondaryAction>
                    <IconButton onClick={() => {
                        setItemToEdit(x);
                        setAddOrUpdateKeysOpen(true);
                    }}>
                        <EditIcon/>
                    </IconButton>
                </ListItemSecondaryAction>
                : x.current_holder?.userId === user.userId ?
                    <ListItemSecondaryAction>
                        <Button color="primary" onClick={() => selectKeyToHandOver(x)}>
                            {t("handover_key")}
                        </Button>
                    </ListItemSecondaryAction>
                    :
                    <ListItemSecondaryAction>
                        <Button color="primary" onClick={() => selectKeyToReceive(x)}>
                            {t("take_key")}
                        </Button>
                    </ListItemSecondaryAction>
        }
    </ListItemButton>
}