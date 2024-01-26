import { CheckCircleOutline, ThumbUpAlt, ThumbUpOffAlt, RemoveCircleOutline, ThumbDownAlt, ThumbDownOffAlt } from "@mui/icons-material"
import { Typography, List, ListItem, ListItemAvatar, CircularProgress, ListItemText, Divider, ListItemSecondaryAction, IconButton, Container } from "@mui/material"
import { t } from "i18next"
import React, { useEffect } from "react"
import { useDispatch } from "react-redux"
import { useClient } from "react-supabase"
import { onEventAttendanceDelete, onEventAttendanceUpdate } from "src/redux/events/eventAttendanceSlice"
import { SliceEvent } from "src/redux/events/eventsSlice"
import { useAppDispatch } from "src/redux/store"
import { maxAttendeesExceeded, answerDeadlineExpired, FullAttendance, Attendance, EventAttendance, EventAttendanceUpdate, User } from "src/types/supabaseTypes"

type EventInformationAttendanceProps = {
    user: User,
    selectedEvent: SliceEvent,
    attendance: FullAttendance[],
    attendanceLoading: boolean,
    updateAttendance: (newValue: EventAttendance, oldValue: EventAttendance) => void,
    setEventAttendanceState: (value: { index: number, open: boolean }) => void
}

const EventInformationAttendance = ({ selectedEvent, attendance, attendanceLoading, updateAttendance, setEventAttendanceState, user }: EventInformationAttendanceProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (!user)
            return;

        let subscription = client.channel("public:event_attendance_user_mapping")
            .on<EventAttendanceUpdate>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_attendance_user_mapping', filter: `id=eq.${selectedEvent.id}` }, payload => dispatch(onEventAttendanceUpdate({ ...(payload.new), userId: user.userId })))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_attendance_user_mapping', filter: `id=eq.${selectedEvent.id}` }, payload => dispatch(onEventAttendanceDelete(payload.old.id)))
            // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user, selectedEvent]);

    return <Container sx={{ p: 0, m: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: "bold", mt: 2 }} color="text.secondary" gutterBottom>
            Teilnehmer
        </Typography>
        <List sx={{ p: 0 }}>
            {
                selectedEvent.maxAttendees && <>
                    <ListItem key={"spotsTaken"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                        <ListItemAvatar sx={{ justifyContent: "left", alignItems: "center", display: "flex" }}>
                            <CircularProgress size={"24px"} thickness={8} sx={{ borderRadius: "100%", p: "2px", position: "relative", zIndex: 2 }} variant="determinate"
                                value={(attendance.filter(x => x.state === "Attending").length / selectedEvent.maxAttendees) * 100} />
                            <CircularProgress variant="determinate" size={"24px"} value={100} thickness={8} sx={{ color: "#eee", p: "2px", position: "absolute", zIndex: 1 }} />
                        </ListItemAvatar>
                        <ListItemText primary={t("events.information.eventSpotsTaken", {
                            taken: attendance.filter(x => x.state === "Attending").length,
                            waitingListLength: selectedEvent.maxAttendees
                        })} />
                    </ListItem>
                    <Divider />
                </>
            }
            <ListItem key={"attendEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
                onClick={() => attendanceLoading ? {} : setEventAttendanceState({
                    open: true,
                    index: 0
                })}>
                <ListItemAvatar sx={{ justifyContent: "left", alignItems: "center", display: "flex" }}>
                    {
                        attendanceLoading ? <CircularProgress size={"20px"} /> :
                            <CheckCircleOutline color="success" />
                    }
                </ListItemAvatar>
                <ListItemText
                    primary={(attendance.filter(x => x.state === "Attending").length) + " zusagen"} />
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => updateAttendance("Attending", selectedEvent.userAttendance)}
                        disabled={selectedEvent.isCancelled || maxAttendeesExceeded(selectedEvent, attendance) || answerDeadlineExpired(selectedEvent)}>
                        {
                            selectedEvent.userAttendance === "Attending"
                                ?
                                <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                                : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                        }
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem key={"declineEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
                onClick={() => attendanceLoading ? {} : setEventAttendanceState({
                    open: true,
                    index: 1
                })}>
                <ListItemAvatar sx={{ justifyContent: "left", alignItems: "center", display: "flex" }}>
                    {
                        attendanceLoading ? <CircularProgress size={"20px"} /> :
                            <RemoveCircleOutline color="error" />
                    }
                </ListItemAvatar>
                <ListItemText
                    primary={(attendance.filter(x => x.state === "Declined").length ?? 0) + " absagen"} />
                <ListItemSecondaryAction>
                    <IconButton
                        onClick={() => updateAttendance("Declined", selectedEvent.userAttendance)}
                        disabled={selectedEvent.isCancelled}>
                        {
                            selectedEvent.userAttendance === "Declined"
                                ?
                                <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                        }
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        </List>
    </Container>
}

export default EventInformationAttendance;