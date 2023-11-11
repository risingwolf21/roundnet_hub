import { AppBar, Avatar, Box, List, ListItem, ListItemAvatar, ListItemText, Tab, Tabs } from "@mui/material"
import { useState } from "react";
import { AccountCircle } from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import { useEffect } from "react";
import React from "react";
import { FullEvent } from "../../types/supabaseTypes";
import { SwipeableDialog } from "../SwipeableDialog";

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
    setOpen: (value: boolean) => void,
    event: FullEvent
}

const EventAttendanceDialog = ({ open, index, setOpen, event }: EventAttendanceDialogProps) => {

    const [value, setValue] = useState(index ?? 0);
    const theme = useTheme();

    useEffect(() => {
        setValue(index);
    }, [index]);

    const handleChange = (event: React.SyntheticEvent<Element, Event>, value: any) => {
        setValue(value);
    };

    return <SwipeableDialog
        title="Teilnehmer"
        open={open}
        minHeight={60}
        onClose={() => setOpen(false)}
        setOpen={setOpen}>
        <Box sx={{ paddingLeft: 0 }}>
            <AppBar position="sticky" sx={{ '&.MuiAppBar-root': { backgroundColor: "#fff", color: "#000" } }}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="inherit"
                    variant="fullWidth">
                    <Tab label="Zusagen" />
                    <Tab label="Absagen" />
                </Tabs>
            </AppBar>
            <TabPanel value={value} index={0} dir={theme.direction}>
                <List>
                    {
                        event && event?.attendance?.filter(x => x.state === "Attending").map((x, index) => <ListItem key={x.userId + index}>
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
                        event && event?.attendance?.filter(x => x.state === "Declined").map((x, index) => <ListItem key={x.userId + index}>
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
    </SwipeableDialog>
}

export default EventAttendanceDialog;