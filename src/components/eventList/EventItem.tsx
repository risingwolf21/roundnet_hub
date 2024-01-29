import { HourglassBottom, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material"
import { Box, CircularProgress, IconButton, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material"
import moment from "moment"
import React from "react"
import { SliceEvent } from "src/redux/events/eventsSlice"
import { answerDeadlineExpired, maxAttendeesExceeded } from "src/types/supabaseTypes"

export type EventItemProps = {
    attendanceUpdating: boolean,
    event: SliceEvent,
    onClick: () => void,
    attendEvent: () => void,
    declineEvent: () => void
}

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating }: EventItemProps) => {

    return <ListItem sx={{ p: 1 }} onClick={onClick}>
        <ListItemAvatar>
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "left" }}>
                <Typography fontSize={10} textAlign={"center"}>
                    {
                        moment(event.startingDateTime).format("MMM").toUpperCase()
                    }
                </Typography>
                <Typography variant="h6" fontWeight={"bold"} textAlign={"center"}>
                    {
                        moment(event.startingDateTime).format("D")
                    }
                </Typography>
            </Box>
        </ListItemAvatar>
        <ListItemText primary={event.title} secondary={event.isCancelled ? "Event abgesagt" : moment(event.startingDateTime).format("dddd [at] HH:mm")} />
        <ListItemSecondaryAction>
            {
                attendanceUpdating
                    ? <CircularProgress />
                    : event.userAttendance === "Waiting"
                        ? <IconButton disabled={event.isCancelled}>
                            <HourglassBottom fontSize="inherit" sx={{ fontSize: "28px", color: "#125db2" }} />
                        </IconButton>
                        : <Box sx={{ display: "flex", flexDirection: "row" }}>
                            <IconButton onClick={declineEvent} disabled={event.isCancelled}>
                                {
                                    event.userAttendance === "Declined"
                                        ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                        : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                }
                            </IconButton>
                            <IconButton onClick={attendEvent} disabled={event.isCancelled || answerDeadlineExpired(event)}>
                                {
                                    event.userAttendance === "Attending"
                                        ? <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                                        : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                }
                            </IconButton>
                        </Box>
            }
        </ListItemSecondaryAction>
    </ListItem>
}