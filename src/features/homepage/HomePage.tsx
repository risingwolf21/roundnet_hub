import { AccessTime, AccountBox, Key, Place, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material"
import { Avatar, Badge, Box, Button, Card, CardActionArea, CardActions, CardContent, CardHeader, CardMedia, IconButton, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import { withProfiler } from "@sentry/react"
import { useNotifications } from "@toolpad/core/useNotifications"
import { format } from "date-fns"
import { t } from "i18next"
import React, { useEffect } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"
import Layout from "src/components/Layout"
import {
    fetchDrinksAsync
} from 'src/features/drinks/slices/drinksSlice'
import { useFetchMode } from "src/hooks/useFetchMode"
import { RootState, useAppDispatch } from "src/redux/store"
import { SupabaseDrinkRepository } from "src/repository/DrinkRepository"
import { answerDeadlineExpired, eventInThePast } from "src/types/supabaseTypes"
import { translationKeyOfItemType } from "src/utils"
import { useAuthentication } from "../auth/AuthContext"
import { useEvents, useUpdateAttendanceMutation } from "../events/useAllEvents"
import { fetchItemsAsync, keyHoldersSelector } from "../keys/slices/keysSlice"

const HomePage = () => {

    const [fetchMode] = useFetchMode();

    const { user } = useAuthentication();
    const { drinks } = useSelector((state: RootState) => state.drinks);
    const { data: events = [] } = useEvents(fetchMode);
    const keys = useSelector(keyHoldersSelector.selectAll);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const notifications = useNotifications();

    const updateAttendance = useUpdateAttendanceMutation(fetchMode);

    useEffect(() => {
        dispatch(fetchDrinksAsync());
        dispatch(fetchItemsAsync())
    }, [dispatch, user]);

    return <Layout>
        <List sx={{ pb: 10 }}>
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
                {events.slice(0, 5).map((event, index) => (
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
                                    fontSize: "1.2rem",
                                    whiteSpace: 'nowrap',
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
                        </CardActionArea>
                        <CardActions disableSpacing sx={{ justifyContent: "start" }}>
                            <IconButton
                                onClick={(e) => {
                                    updateAttendance.mutate({ user, event, newState: "Declined" })
                                    e.stopPropagation();
                                }}
                                disabled={event.isCancelled || eventInThePast(event)}
                            >
                                <Badge badgeContent={event.declined_count ?? 0} color="error">
                                    {event.user_state === 'Declined' ? (
                                        <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
                                    ) : (
                                        <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                                    )}
                                </Badge>
                            </IconButton>
                            <IconButton
                                onClick={(e) => {
                                    updateAttendance.mutate({ user, event, newState: "Attending" })
                                    e.stopPropagation();
                                }}
                                disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
                            >
                                <Badge badgeContent={event.attending_count ?? 0} color="success">
                                    {event.user_state === 'Attending' ? (
                                        <ThumbUpAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
                                    ) : (
                                        <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                                    )}
                                </Badge>
                            </IconButton>
                        </CardActions>
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
                            width: 200,
                            flexShrink: 0,
                            p: 0
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", flexDirection: "row" }}>
                                <CardContent sx={{ flex: '1 0 auto' }}>
                                    <Typography component="div" variant="h5" sx={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {drink.name}
                                    </Typography>
                                </CardContent>
                            </Box>
                            <CardMedia
                                component="img"
                                sx={{ width: 100, height: "100%" }}
                                image={drink.imageUrl || ""}
                                alt="Drink image"
                            />
                        </Box>
                        <CardActions>
                            <Button color="primary"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    SupabaseDrinkRepository.insertHistoryItems([{
                                        ...drink,
                                        count: 1
                                    }]).then((result) => {
                                        notifications.show("Getränk erfolgreich gebucht!", { severity: "info", autoHideDuration: 1500 })
                                    }).catch(error => {
                                        notifications.show(`Getränk konnte nicht gebucht werden. ${error.message}`, { severity: "error" })
                                    })
                                }}>Kaufen</Button>
                        </CardActions>
                    </Card>
                ))}
            </Box>
            <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                Schlüssel
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    overflowX: "auto",
                    gap: 2,
                    padding: 1,
                }}
            >
                {keys
                    .filter(x => x.full_current_holder !== null)
                    .map((key, index) => (
                        <Card
                            key={index}
                            elevation={3}
                            sx={{
                                width: 200,
                                flexShrink: 0,
                                p: 0,
                            }}
                        >
                            <CardActionArea sx={{ p: 2, pb: 0 }} onClick={() => navigate(`/keys`)}>
                                <Typography sx={{
                                    mb: 1,
                                    fontSize: "1.2rem",
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>{key.name}</Typography>
                                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", mb: 1 }}>
                                    <Avatar sx={{ background: key.color, width: 40, height: 40, borderRadius: 2, mr: 1 }}>
                                        <Key />
                                    </Avatar>
                                    <Typography>{t(translationKeyOfItemType(key.type))}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                    <Avatar sx={{ width: 40, height: 40, borderRadius: 2, mr: 1 }}>
                                        {key.full_current_holder!.avatarUrl ? <img src={key.full_current_holder!.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
                                    </Avatar>
                                    <Typography>{key.full_current_holder!.displayName}</Typography>
                                </Box>
                            </CardActionArea>
                            <CardActions>
                                {
                                    key.full_current_holder?.userId === user?.userId ? (
                                        <Button
                                            color="primary"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/keys?type=handover&key=${encodeURIComponent(key.id)}`)
                                            }}
                                        >
                                            {t('handover_key')}
                                        </Button>
                                    ) : (
                                        <Button
                                            color="primary"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/keys?type=take&key=${encodeURIComponent(key.id)}`);
                                            }}
                                        >
                                            {t('take_key')}
                                        </Button>
                                    )
                                }
                            </CardActions>
                        </Card>
                    ))}
            </Box>
        </List>
    </Layout >
}
export default withProfiler(HomePage);