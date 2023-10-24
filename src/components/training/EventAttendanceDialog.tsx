import { AppBar, Avatar, Box, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, Tab, Tabs, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { useState } from "react";
import { AccountCircle, Close } from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import { useEffect } from "react";
import React from "react";
import { FullEvent } from "../../types/supabaseTypes";

function TabPanel(props: any) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
}

type EventAttendanceDialogProps = {
    open: boolean,
    index: number,
    handleClose: () => void,
    event: FullEvent
}

const EventAttendanceDialog = ({ open, index, handleClose, event }: EventAttendanceDialogProps) => {

    const [value, setValue] = useState(index ?? 0);
    const theme = useTheme();

    useEffect(() => {
        setValue(index);
    }, [index]);

    const handleChange = (event: React.SyntheticEvent<Element, Event>, value: any) => {
        setValue(value);
    };

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box>
            <AppBar position="sticky">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        sx={{ mr: 2 }}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Teilnehmer
                    </Typography>
                </Toolbar>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="secondary"
                    textColor="inherit"
                    variant="fullWidth"
                    aria-label="full width tabs example">
                    <Tab label="Zusagen" />
                    <Tab label="Absagen" />
                </Tabs>
            </AppBar>
            <TabPanel value={value} index={0} dir={theme.direction}>
                <List>
                    {
                        event && event?.attendance?.filter(x => x.state === "Attending").map(x => <ListItem key={x.userId}>
                            <ListItemAvatar>
                                <Avatar>
                                    <AccountCircle />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={x.user?.displayName} />
                        </ListItem>)
                    }
                </List>
            </TabPanel>
            <TabPanel value={value} index={1} dir={theme.direction}>
                <List>
                    {
                        event && event?.attendance?.filter(x => x.state === "Declined").map(x => <ListItem key={x.userId}>
                            <ListItemAvatar>
                                <Avatar>
                                    <AccountCircle />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={x.user?.displayName} />
                        </ListItem>)
                    }
                </List>
            </TabPanel>
        </Box>
    </Dialog>
}

export default EventAttendanceDialog;