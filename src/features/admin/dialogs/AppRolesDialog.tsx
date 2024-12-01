import {allUserRoles, SlideUpTransition} from "../../../utils";
import {Box} from "@mui/system";
import {
    AppBar,
    Button,
    Checkbox,
    Dialog,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Toolbar,
    Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React, {useState} from "react";

type AppRolesDialogProps = {
    open: boolean,
    roles: AppRole[],
    handleClose: () => void,
    handleSubmit: (roles: AppRole[]) => void
}

export const AppRolesDialog = ({open, handleClose, handleSubmit, roles}: AppRolesDialogProps) => {

    const [selectedAppRoles, setSelectedAppRoles] = useState<AppRole[]>(roles);

    const handleRoleChange = (checked: boolean, role: AppRole) => {
        if (checked) {
            setSelectedAppRoles([...new Set([...selectedAppRoles, role])]);
        } else {
            setSelectedAppRoles(selectedAppRoles.filter(x => x !== role))
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
                        Benutzer rollen bearbeiten
                    </Typography>
                    <Button sx={{color: "white"}} onClick={() => handleSubmit(selectedAppRoles)}>
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <Box>
                <Table>
                    <TableBody>
                        {
                            allUserRoles.map(x => <TableRow key={x}
                                                            sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                <TableCell sx={{p: 1}}>
                                    <Checkbox
                                        checked={selectedAppRoles.includes(x)}
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