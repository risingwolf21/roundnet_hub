import {
    AppBar,
    Avatar,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText,
    Tab,
    Tabs,
    Typography
} from "@mui/material"
import React, {useEffect, useState} from "react";
import {AccountBox} from "@mui/icons-material";
import {useTheme} from '@mui/material/styles';
import {FullAttendance} from "../../../types/supabaseTypes";
import {SwipeableDialog} from "../../../components/SwipeableDialog";
import {EventAttendanceDialogProps} from "../types";
import {isBefore} from "date-fns";
import {useNavigate} from "react-router-dom";

function TabPanel(props: any) {
    const {children, value, index, ...other} = props;

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


const EventAttendanceDialog = ({open, index, setOpen, attendance, hasWaitingList}: EventAttendanceDialogProps) => {

    const [value, setValue] = useState(index ?? 0);
    const theme = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        setValue(index);
    }, [index]);

    const handleChange = (event: React.SyntheticEvent<Element, Event>, value: any) => {
        setValue(value);
    };

    return <SwipeableDialog
        title="Teilnehmer"
        open={open}
        onClose={() => setOpen(false)}
        minHeight={60}
        setOpen={setOpen}>
        <Box sx={{paddingLeft: 0}}>
            <AppBar position="sticky" sx={{'&.MuiAppBar-root': {backgroundColor: "#fff", color: "#000"}}}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="inherit"
                    variant="fullWidth">
                    <Tab label="Zusagen"/>
                    <Tab label="Absagen"/>
                    {
                        hasWaitingList && <Tab label="Warteliste"/>
                    }
                </Tabs>
            </AppBar>
            <TabPanel value={value} index={0} dir={theme.direction}>
                <List>
                    {
                        attendance.filter((x: FullAttendance) => x.state === "Attending").map((x: FullAttendance, index: number) =>
                            <ListItemButton key={x.user.userId + index}
                                            onClick={() => navigate("/user/" + x.user.userId)}>
                                <ListItemAvatar>
                                    <Avatar sx={{borderRadius: 2}}>
                                        {
                                            x.user.avatarUrl
                                                ?
                                                <img src={x.user.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                                                : <AccountBox/>
                                        }
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={x.user?.displayName}/>
                            </ListItemButton>)
                    }
                </List>
            </TabPanel>
            <TabPanel value={value} index={1} dir={theme.direction}>
                <List>
                    {
                        attendance.filter((x: FullAttendance) => x.state === "Declined").map((x: FullAttendance, index: number) =>
                            <ListItemButton key={x.user.userId + index}
                                            onClick={() => navigate("/user/" + x.user.userId)}>
                                <ListItemAvatar>
                                    <Avatar sx={{borderRadius: 2}}>
                                        {
                                            x.user.avatarUrl
                                                ?
                                                <img src={x.user.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                                                : <AccountBox/>
                                        }
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={x.user?.displayName}/>
                            </ListItemButton>)
                    }
                </List>
            </TabPanel>
            {
                hasWaitingList && <TabPanel value={value} index={2} dir={theme.direction}>
                    <List>
                        {
                            attendance.filter((x: FullAttendance) => x.state === "Waiting").sort((a, b) => isBefore(a.lastUpdate, b.lastUpdate) ? 1 : 0).map((x: FullAttendance, index: number) =>
                                <ListItem key={x.user.userId + index}>
                                    <ListItemAvatar>
                                        <Avatar sx={{borderRadius: 2}}>
                                            {
                                                x.user.avatarUrl
                                                    ?
                                                    <img src={x.user.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                                                    : <AccountBox/>
                                            }
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={x.user?.displayName}/>
                                    <ListItemSecondaryAction>
                                        <Typography fontWeight={"bold"}>{`${index + 1}.)`}</Typography>
                                    </ListItemSecondaryAction>
                                </ListItem>)
                        }
                    </List>
                </TabPanel>
            }
        </Box>
    </SwipeableDialog>
}

export default EventAttendanceDialog;