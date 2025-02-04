import { AccessTime, LocationCity, Place, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material"
import { Badge, Box, Card, CardActionArea, CardActions, CardContent, CardHeader, CardMedia, Grid2, IconButton, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import React from "react"
import { useSelector } from "react-redux"
import Layout from "src/components/Layout"
import { RootState, useAppDispatch } from "src/redux/store"
import { answerDeadlineExpired, eventInThePast } from "src/types/supabaseTypes"
import { useAuth } from "../auth/AuthContext"
import { updateAttendanceAsync } from "../events/slices/eventAttendanceSlice"
import { eventsSelector } from "../events/slices/eventsSlice"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"

export const HomePage = () => {

    const { user } = useAuth();
    const events = useSelector(eventsSelector.selectAll);
    const { drinks } = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    return <Layout>
        <Box>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                Events
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    overflowX: "auto",
                    gap: 2,
                    padding: 1,
                }}
            >
                {events.map((event, index) => (
                    <Card
                        key={index}
                        elevation={3}
                        sx={{
                            width: 200,
                            flexShrink: 0,
                        }}
                    >
                        <CardActionArea onClick={() => navigate('/training/event/' + event.id)}>
                            <CardHeader
                                sx={{ pb: 1 }}
                                title={event.title}
                                titleTypographyProps={{
                                    fontSize: "1.2rem", whiteSpace: 'nowrap',
                                    overflow: 'clip',
                                    textOverflow: 'ellipsis',
                                }} />


                            <CardContent sx={{ pt: 1 }}>
                                <ListItem disablePadding dense>
                                    <ListItemAvatar sx={{ display: 'flex', minWidth: "40px" }}>
                                        <AccessTime />
                                    </ListItemAvatar>
                                    <ListItemText primary={format(event.startingDateTime, "EEE dd.MM HH:mm")} />
                                </ListItem>
                                {
                                    event.place && <ListItem disablePadding dense>
                                        <ListItemAvatar sx={{ display: 'flex', minWidth: "40px" }}>
                                            <Place />
                                        </ListItemAvatar>
                                        <ListItemText primary={JSON.parse(event.place!)["name"]} slotProps={{
                                            primary: {
                                                whiteSpace: 'nowrap',
                                                overflow: 'clip',
                                                textOverflow: 'ellipsis',
                                            }
                                        }} />
                                    </ListItem>
                                }
                            </CardContent>
                            <CardActions disableSpacing sx={{ justifyContent: "start" }}>
                                <IconButton
                                    onClick={(e) => {
                                        dispatch(updateAttendanceAsync({ user: user!, eventId: event.id, state: "Declined", oldState: event.userAttendance }))
                                        e.stopPropagation();
                                    }}
                                    disabled={event.isCancelled || eventInThePast(event)}
                                >
                                    <Badge badgeContent={event.attendance.filter(x => x.state === "Declined").length} color="error">
                                        {event.userAttendance === 'Declined' ? (
                                            <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
                                        ) : (
                                            <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                                        )}
                                    </Badge>
                                </IconButton>
                                <IconButton
                                    onClick={(e) => {
                                        dispatch(updateAttendanceAsync({ user: user!, eventId: event.id, state: "Attending", oldState: event.userAttendance }));
                                        e.stopPropagation();
                                    }}
                                    disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
                                >
                                    <Badge badgeContent={event.attendance.filter(x => x.state === "Attending").length} color="success">
                                        {event.userAttendance === 'Attending' ? (
                                            <ThumbUpAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
                                        ) : (
                                            <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                                        )}
                                    </Badge>
                                </IconButton>
                            </CardActions>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                Getränke
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    overflowX: "auto",
                    gap: 2,
                    padding: 1,
                }}
            >
                {drinks.filter((x: Drink) => !x.deleted && x.active && x.type === "Drink").map((drink, index) => (
                    <Card
                        key={index}
                        elevation={3}
                        sx={{
                            display: "flex",
                            width: 200,
                            flexShrink: 0,
                            p: 0,
                        }}
                    >
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                            <CardContent sx={{ flex: '1 0 auto' }}>
                                <Typography component="div" variant="h5">
                                    {drink.name}
                                </Typography>
                            </CardContent>
                        </Box>
                        <CardMedia
                            component="img"
                            sx={{ width: 100, height: "100%" }}
                            image={drink.imageUrl || ""}
                            alt="Live from space album cover"
                        />
                    </Card>
                ))}
            </Box>
        </Box>
    </Layout >
}