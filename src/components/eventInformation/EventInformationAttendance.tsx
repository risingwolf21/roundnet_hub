import {
    CheckCircleOutline,
    HourglassBottom,
    RemoveCircleOutline,
    ThumbDownAlt,
    ThumbDownOffAlt,
    ThumbUpAlt,
    ThumbUpOffAlt,
    VerifiedOutlined
} from "@mui/icons-material"
import {
    CircularProgress,
    Container,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Typography
} from "@mui/material"
import {t} from "i18next"
import React, {useEffect, useState} from "react"
import {useClient} from "react-supabase"
import {onEventAttendanceDelete, onEventAttendanceUpdate} from "src/redux/events/eventAttendanceSlice"
import {SliceEvent} from "src/redux/events/eventsSlice"
import {useAppDispatch} from "src/redux/store"
import {
    answerDeadlineExpired,
    EventAttendance,
    eventInThePast,
    FullAttendance,
    FullItemHolder,
    maxAttendeesExceeded,
    User
} from "src/types/supabaseTypes"
import EventAttendanceDialog from "./EventAttendanceDialog"
import {TablesUpdate} from "../../types/supabase-generated.types";

type EventInformationAttendanceProps = {
    user: User,
    selectedEvent: SliceEvent,
    attendance: FullAttendance[],
    keyHolders: FullItemHolder[],
    attendanceLoading: boolean,
    updateAttendance: (newValue: EventAttendance, oldValue: EventAttendance) => void,
}

const EventInformationAttendance = ({
                                        selectedEvent,
                                        attendance,
                                        attendanceLoading,
                                        updateAttendance,
                                        user,
                                        keyHolders
                                    }: EventInformationAttendanceProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    const [eventAttendanceState, setEventAttendanceState] = useState({open: false, index: 0});

    useEffect(() => {
        if (!user)
            return;

        let subscription = client.channel("public:event_attendance_user_mapping")
            .on<TablesUpdate<'event_attendance_user_mapping'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'event_attendance_user_mapping',
                filter: `id=eq.${selectedEvent.id}`
            }, payload => dispatch(onEventAttendanceUpdate({...(payload.new), userId: user.userId})))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'event_attendance_user_mapping',
                filter: `id=eq.${selectedEvent.id}`
            }, payload => dispatch(onEventAttendanceDelete(payload.old.id)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user, selectedEvent]);

    return <Container sx={{p: 0, alignSelf: "center"}}>
        <Typography sx={{fontSize: 16, fontWeight: "bold", mt: 2}} color="text.secondary" gutterBottom>
            {t("attendees")}
        </Typography>
        <List sx={{p: 0}}>
            {
                attendance.filter(x => x.state === "Attending").map(y => y.user.userId)
                    .some(x => keyHolders.filter(y => y.type === selectedEvent.key).map(y => y.user?.userId).includes(x)) &&
                <ListItem key={"keyAttendees"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}} divider>
                    <ListItemAvatar sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                        <VerifiedOutlined sx={{color: (theme) => theme.palette.success.main}}/>
                    </ListItemAvatar>
                    <ListItemText primary={t("events.information.keyHolderAttending")}/>
                </ListItem>
            }
            {
                selectedEvent.maxAttendees && selectedEvent.maxAttendees >= 0 &&
                <ListItem key={"spotsTaken"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}} divider>
                    <ListItemAvatar sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                        <CircularProgress size={"24px"} thickness={8}
                                          sx={{borderRadius: "100%", p: "2px", position: "relative", zIndex: 2}}
                                          variant="determinate"
                                          value={(attendance.filter(x => x.state === "Attending").length / selectedEvent.maxAttendees) * 100}/>
                        <CircularProgress variant="determinate" size={"24px"} value={100} thickness={8}
                                          sx={{color: "#eee", p: "2px", position: "absolute", zIndex: 1}}/>
                    </ListItemAvatar>
                    <ListItemText primary={t("events.information.eventSpotsTaken", {
                        taken: attendance.filter(x => x.state === "Attending").length,
                        waitingListLength: selectedEvent.maxAttendees
                    })}/>
                </ListItem>
            }
            <ListItem key={"attendEvent"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}}
                      onClick={() => attendanceLoading ? {} : setEventAttendanceState({
                          open: true,
                          index: 0
                      })}>
                <ListItemAvatar sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                    {
                        attendanceLoading ? <CircularProgress size={"20px"}/> :
                            <CheckCircleOutline color="success"/>
                    }
                </ListItemAvatar>
                <ListItemText
                    primary={(attendance.filter(x => x.state === "Attending").length) + " zusagen"}/>
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => updateAttendance("Attending", selectedEvent.userAttendance)}
                        disabled={selectedEvent.isCancelled || maxAttendeesExceeded(selectedEvent, attendance) || answerDeadlineExpired(selectedEvent) || eventInThePast(selectedEvent)}>
                        {
                            selectedEvent.userAttendance === "Attending"
                                ?
                                <ThumbUpAlt fontSize="inherit" sx={{fontSize: "28px", color: "green"}}/>
                                : <ThumbUpOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                        }
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
            <Divider/>
            <ListItem key={"declineEvent"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}}
                      onClick={() => attendanceLoading ? {} : setEventAttendanceState({
                          open: true,
                          index: 1
                      })}>
                <ListItemAvatar sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                    {
                        attendanceLoading ? <CircularProgress size={"20px"}/> :
                            <RemoveCircleOutline color="error"/>
                    }
                </ListItemAvatar>
                <ListItemText
                    primary={(attendance.filter(x => x.state === "Declined").length ?? 0) + " absagen"}/>
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => updateAttendance("Declined", selectedEvent.userAttendance)}
                        disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent)}>
                        {
                            selectedEvent.userAttendance === "Declined"
                                ?
                                <ThumbDownAlt fontSize="inherit" sx={{fontSize: "28px", color: "red"}}/>
                                : <ThumbDownOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                        }
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
            {
                (attendance.filter(x => x.state === "Waiting").length ?? 0) > 0 && <>
                    <Divider/>
                    <ListItem key={"waitingEvent"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}}
                              onClick={() => attendanceLoading ? {} : setEventAttendanceState({
                                  open: true,
                                  index: 2
                              })}>
                        <ListItemAvatar sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                            {
                                attendanceLoading ? <CircularProgress size={"20px"}/> :
                                    <HourglassBottom sx={{color: "#125db2"}}/>
                            }
                        </ListItemAvatar>
                        <ListItemText
                            primary={(attendance.filter(x => x.state === "Waiting").length ?? 0) + " warten"}/>
                    </ListItem>
                </>
            }
        </List>
        <Divider/>

        <EventAttendanceDialog
            open={eventAttendanceState.open}
            index={eventAttendanceState.index}
            hasWaitingList={attendance.some(x => x.state === "Waiting")}
            setOpen={(value) => setEventAttendanceState({open: value, index: eventAttendanceState.index})}
            attendance={attendance}/>
    </Container>
}

export default EventInformationAttendance;