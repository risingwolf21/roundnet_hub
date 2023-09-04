import { AppBar, Avatar, Box, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, Tab, Tabs, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { useState } from "react";
import { AccountCircle, Close } from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import { ATTENDING, DECLINED } from "../../constants";

function TabPanel(props) {
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

const EventAttendanceDialog = ({ open, handleClose, event }) => {

    const [value, setValue] = useState(0);
    const theme = useTheme();

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box>
            <AppBar position="static">
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
                        event && event?.attendance?.filter(x => x.state === ATTENDING).map(x => <ListItem key={x}>
                            <ListItemAvatar>
                                <Avatar>
                                    <AccountCircle />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={x.user.displayName} />
                        </ListItem>)
                    }
                </List>
            </TabPanel>
            <TabPanel value={value} index={1} dir={theme.direction}>
                <List>
                    {
                        event && event?.attendance?.filter(x => x.state === DECLINED).map(x => <ListItem key={x}>
                            <ListItemAvatar>
                                <Avatar>
                                    <AccountCircle />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={x.user.displayName} />
                        </ListItem>)
                    }
                </List>
            </TabPanel>
        </Box>
    </Dialog>
}

export default EventAttendanceDialog;