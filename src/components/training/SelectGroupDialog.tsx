import React, { useEffect, useState } from "react";
import { AppBar, Avatar, Button, Chip, Dialog, Divider, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, ListSubheader, Table, TableBody, TableCell, TableHead, TableRow, TextField, Toolbar, Typography } from "@mui/material"
import CloseIcon from '@mui/icons-material/Close';
import { Box } from "@mui/system";
import Checkbox from '@mui/material/Checkbox';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import EuroIcon from '@mui/icons-material/Euro';
import InventoryIcon from '@mui/icons-material/Inventory';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import { AccountCircle, AdminPanelSettings, Check, EuroRounded, FiberManualRecord, Liquor, SportsHandball } from "@mui/icons-material";
import { SlideUpTransition } from "../../utils";
import { allPermissions, financePermissions, procurePermissions, trainerPermissions, userPermissions } from "src/utils/PermissionService";
import { Group, Permissions, UserRole } from "src/types/supabaseTypes";
import { useDependency } from "src/hooks/useDependency";
import { IAdminUsersRepository } from "src/repository/IAdminUsersRepository";
import { IEventRepository } from "src/repository/IEventRepository";
import { useSelector } from "react-redux";
import { RootState } from "src/redux/store";

type SelectGroupDialogProps = {
    open: boolean,
    handleClose: () => void,
    handleSubmit: (group: Group) => void
}

export const SelectGroupDialog = ({ open, handleClose, handleSubmit }: SelectGroupDialogProps) => {

    const [groups, setGroups] = useState<Group[]>([]);
    const repo = useDependency<IEventRepository>("IEventRepository");
    const user = useSelector((state: RootState) => state.application.user);

    useEffect(() => {
        if (user)
            repo?.fetchUserGroups(user).then(x => {
                setGroups(x?.data?.map(y => y.group) ?? []);
            })
    }, [open, user]);

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" noValidate>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Gruppe wählen
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    {
                        groups.map(x => <ListItemButton divider onClick={() => handleSubmit(x)}>
                            <ListItemAvatar>
                                <FiberManualRecord sx={{ color: x.color }} />
                            </ListItemAvatar>
                            <ListItemText primary={x.name} secondary={x.description} />
                        </ListItemButton>)
                    }
                </List>
            </Box>
        </Box>
    </Dialog>
}