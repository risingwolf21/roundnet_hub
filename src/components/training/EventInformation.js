import { AppBar, Box, Button, Container, Dialog, Divider, IconButton, ListItem, ListItemAvatar, ListItemText, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils";
import { ArrowBack, CalendarMonth, Check, CheckCircle, CheckCircleOutline, Close, DoNotDisturb, HelpOutline, Pending, RemoveCircleOutline } from "@mui/icons-material";
import { useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from 'react-router-dom';

const EventInformation = ({ handleClose }) => {

    const navigate = useNavigate();

    const { selectedEvent } = useSelector((state) => state.events);

    return <Dialog
        fullScreen
        open={true}
        onClose={() => navigate("/training")}
        TransitionComponent={SlideUpTransition}>
        <Box>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate("/training")}
                        aria-label="close">
                        <ArrowBack />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Box pl={2} pt={2}>
                <Typography variant="h5" fontWeight={"bold"}>{selectedEvent?.title}</Typography>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <CalendarMonth />
                    </ListItemAvatar>
                    <ListItemText>{moment(new Date(selectedEvent?.meetingDateTime)).format("DD-MM-yyyy [at] HH:mm")}</ListItemText>
                </ListItem>
                <Typography variant="h6" fontWeight="bold">Beschreibung</Typography>
                <Typography pb={2}>{selectedEvent?.description}</Typography>
                <Divider />
                <Box pt={2} pb={2} pr={2}>
                    <Button variant="outlined" color="success" sx={{ width: "50%" }} startIcon={<CheckCircleOutline />}>Teilnehmen</Button>
                    <Button variant="outlined" color="error" sx={{ width: "50%" }} startIcon={<Close />}>Absagen</Button>
                </Box>
                <Divider />
                <Typography pt={2} variant="h6" fontWeight="bold">Teilnehmer</Typography>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <CheckCircleOutline color="success" />
                    </ListItemAvatar>
                    <ListItemText>0 zusagen</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <HelpOutline color="warning" />
                    </ListItemAvatar>
                    <ListItemText>0 zusagen</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <RemoveCircleOutline color="error" />
                    </ListItemAvatar>
                    <ListItemText>0 zusagen</ListItemText>
                </ListItem>
                <Divider />
            </Box>
        </Box>
    </Dialog>
}

export default EventInformation;