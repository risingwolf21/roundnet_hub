import { AccountCircle, AdminPanelSettings, EuroRounded, Liquor, SportsHandball } from "@mui/icons-material";
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, Button, Chip, Dialog, Divider, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Toolbar, Typography } from "@mui/material";
import Checkbox from '@mui/material/Checkbox';
import { Box } from "@mui/system";
import React, { useState } from "react";
import { Permissions, UserRole } from "src/types/supabaseTypes";
import { allPermissions, financePermissions, procurePermissions, trainerPermissions, userPermissions } from "src/utils/PermissionService";
import { SlideUpTransition } from "../../utils";

type UserPermissionsDialogProps = {
    open: boolean,
    permissions: Permissions[],
    handleClose: () => void,
    handleSubmit: (permissions: Permissions[]) => void
}

export const UserPermissionsDialog = ({ open, handleClose, handleSubmit, permissions }: UserPermissionsDialogProps) => {

    const [selectedUserPermissions, setSelectedUserPermissions] = useState<Permissions[]>(permissions);

    const handlePermissionChange = (checked: boolean, permission: Permissions) => {
        if (checked) {
            setSelectedUserPermissions([...new Set([...selectedUserPermissions, permission])]);
        } else {
            setSelectedUserPermissions(selectedUserPermissions.filter(x => x !== permission))
        }
    }

    const chipClicked = (role: UserRole) => {
        switch (role) {
            case "admin":
                setSelectedUserPermissions(allPermissions)
                break;
            case "procure":
                setSelectedUserPermissions(procurePermissions)
                break;
            case "finance":
                setSelectedUserPermissions(financePermissions)
                break;
            case "trainer":
                setSelectedUserPermissions(trainerPermissions)
                break;
            case "user":
                setSelectedUserPermissions(userPermissions)
                break;
        }
    }

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
                        Berechtigungen bearbeiten
                    </Typography>
                    <Button sx={{ color: "white" }} onClick={() => handleSubmit(selectedUserPermissions)}>
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <Box>
                <Grid sx={{ width: "100%", p: 1 }}>
                    <Chip onClick={() => chipClicked("admin")} icon={<AdminPanelSettings />} label="Admin" sx={{ mx: 1, my: 1 }} />
                    <Chip onClick={() => chipClicked("finance")} icon={<EuroRounded />} label="Finance" sx={{ mx: 1, my: 1 }} />
                    <Chip onClick={() => chipClicked("procure")} icon={<Liquor />} label="Procure" sx={{ mx: 1, my: 1 }} />
                    <Chip onClick={() => chipClicked("trainer")} icon={<SportsHandball />} label="Trainer" sx={{ mx: 1, my: 1 }} />
                    <Chip onClick={() => chipClicked("user")} icon={<AccountCircle />} label="User" sx={{ mx: 1, my: 1 }} />
                </Grid>
                <Divider />
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ p: 1 }}></TableCell>
                            <TableCell sx={{ p: 1 }}>Berechtigung</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            allPermissions.map(x => <TableRow key={x} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ p: 1 }}>
                                    <Checkbox
                                        checked={selectedUserPermissions.includes(x)}
                                        disabled={["view;drink", "view;user"].includes(x)}
                                        onChange={(e, checked) => handlePermissionChange(checked, x)} />
                                </TableCell>
                                <TableCell sx={{ p: 1 }}>{x}</TableCell>
                            </TableRow>)
                        }
                    </TableBody>
                </Table>
            </Box>
        </Box>
    </Dialog>
}