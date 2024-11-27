import {FiberManualRecord} from "@mui/icons-material";
import CloseIcon from '@mui/icons-material/Close';
import {
    AppBar,
    Dialog,
    IconButton,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography
} from "@mui/material";
import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "src/redux/store";
import {SlideUpTransition} from "../../../utils";
import {SelectGroupDialogProps} from "../types";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {SupabaseEventRepository} from "../../../repository/EventRepository";

export const SelectGroupDialog = ({ open, handleClose, handleSubmit }: SelectGroupDialogProps) => {

    const [groups, setGroups] = useState<Group[]>([]);
    const user = useSelector((state: RootState) => state.application.user);

    useEffect(() => {
        if (user && open)
            SupabaseEventRepository.fetchUserGroups(user).then((x: PostgrestSingleResponse<{
                user: { userId: string },
                group: Group
            }[]>) => {
                setGroups(x.data?.map(y => y.group) ?? []);
            });
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
                        groups.map(x => <ListItemButton key={x.id} divider onClick={() => handleSubmit(x)}>
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