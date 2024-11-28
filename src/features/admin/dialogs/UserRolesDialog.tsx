import CloseIcon from '@mui/icons-material/Close';
import {
    AppBar,
    Button,
    Dialog,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Toolbar,
    Typography
} from "@mui/material";
import Checkbox from '@mui/material/Checkbox';
import {Box} from "@mui/system";
import React, {useState} from "react";
import {SlideUpTransition} from "../../../utils";
import {allAppRoles} from "../../../types/supabaseTypes";

type UserRolesDialogProps = {
    open: boolean,
    roles: AppRole[],
    handleClose: () => void,
    handleSubmit: (permissions: AppRole[]) => void
}

export const UserRolesDialog = ({open, handleClose, handleSubmit, roles}: UserRolesDialogProps) => {

    const [selectedUserRoles, setSelectedUserRoles] = useState<AppRole[]>(roles);

    const handleRoleChange = (checked: boolean, role: AppRole) => {
        if (checked) {
            setSelectedUserRoles([...new Set([...selectedUserRoles, role])]);
        } else {
            setSelectedUserRoles(selectedUserRoles.filter(x => x !== role))
        }
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" noValidate>
            <AppBar sx={{position: "relative"}}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <CloseIcon/>
                    </IconButton>
                    <Typography sx={{ml: 2, flex: 1}} variant="h6" component="div">
                        Berechtigungen bearbeiten
                    </Typography>
                    <Button sx={{color: "white"}} onClick={() => handleSubmit(selectedUserRoles)}>
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <Box>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{p: 1}}></TableCell>
                            <TableCell sx={{p: 1}}>Berechtigung</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            allAppRoles.map((x: AppRole) => <TableRow key={x}
                                                                      sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                <TableCell sx={{p: 1}}>
                                    <Checkbox
                                        checked={selectedUserRoles.includes(x)}
                                        onChange={(e, checked) => handleRoleChange(checked, x)}/>
                                </TableCell>
                                <TableCell sx={{p: 1}}>{x}</TableCell>
                            </TableRow>)
                        }
                    </TableBody>
                </Table>
            </Box>
        </Box>
    </Dialog>
}