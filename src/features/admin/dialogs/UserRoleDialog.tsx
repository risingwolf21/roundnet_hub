import {SlideUpTransition} from "../../../utils";
import {Box} from "@mui/system";
import {
    AppBar,
    Button,
    Checkbox,
    Dialog,
    IconButton, List, ListItem,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Toolbar,
    Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React, {useEffect, useState} from "react";
import {AdminPermissionsRepository} from "../../../repository/AdminPermissionsRepository";
import {SwipeableDialog} from "../../../components/SwipeableDialog";

type UserRoleDialogProps = {
    open: boolean,
    role: UserRole,
    handleClose: () => void,
    handleSubmit: (role: UserRole) => void
}

export const UserRoleDialog = ({open, handleClose, handleSubmit, role}: UserRoleDialogProps) => {

    return <SwipeableDialog
        open={open}
        onClose={handleClose}
        title={"User Role wählen"}>
        <List>
            {
                (["admin", "user", "finance", "trainer", "procure"] as UserRole[]).map(x =>
                <ListItem onClick={()=> handleSubmit(x)}>
                    <ListItemText primary={x} />
                </ListItem>)
            }
        </List>
    </SwipeableDialog>
}