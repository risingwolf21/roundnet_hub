import AddIcon from '@mui/icons-material/Add';
import {Chip, Divider, Fab, Grid, LinearProgress} from "@mui/material";
import React, {useEffect, useState} from "react";
import {useNavigate} from 'react-router-dom';
import {useClient} from "react-supabase";
import {useAppDispatch} from "../../redux/store";
import {EventAttendance, User} from "../../types/supabaseTypes";
import CustomAppBar from "../../components/AppBar";
import {InfiniteScrollList} from "../../components/InfiniteScrollList";
import {EventItem} from "./components/EventItem";
import {
    fetchPastEventsAsync,
    fetchUpcomingEventsAsync,
    onEventDelete,
    onEventErrorRead,
    onEventUpdate,
    SliceEvent
} from 'src/features/events/slices/eventsSlice';
import {updateAttendanceAsync} from 'src/features/events/slices/eventAttendanceSlice';
import {can} from "../../utils/PermissionService";
import {TablesUpdate} from "../../types/supabase-generated.types";
import {t} from "i18next";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import {EventRepeat} from "@mui/icons-material";

export type EventScreenProps = {
    events: SliceEvent[],
    loading: boolean,
    error: AlertMessage | null,
    endReached: boolean,
    user: User
}

const EventScreen = ({events, loading, error, endReached, user}: EventScreenProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [fetchEventMode, setFetchEventMode] = useState<"upcoming" | "past">("upcoming");

    useEffect(() => {
        let subscription = client.channel("public:events")
            .on<TablesUpdate<'events'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'events'
            }, payload => dispatch(onEventUpdate(payload.new)))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'events'
            }, payload => dispatch(onEventDelete(payload.old.id)))
            // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch]);

    useEffect(() => {
        dispatch(fetchUpcomingEventsAsync({user, page: 0, count: 20}));
    }, [dispatch, user]);

    const fetchEvents = (mode: "upcoming" | "past", page: number, count: number) => {
        if (mode === "upcoming")
            dispatch(fetchUpcomingEventsAsync({user, page, count}));
        else
            dispatch(fetchPastEventsAsync({user, page, count}));
    }

    const switchEventFetching = (mode: "upcoming" | "past") => {
        setFetchEventMode(mode);
        fetchEvents(mode, 0, 20);
    }

    const updateAttendance = async (eventId: string, state: EventAttendance, oldState: EventAttendance) => {
        dispatch(updateAttendanceAsync({user, eventId, state, oldState}));
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar/>
        {
            loading && <LinearProgress sx={{position: "fixed", top: 56, left: 0, right: 0}}/>
        }
        <Grid container p={2} alignItems={"start"} justifyContent="start" direction={"row"} width={"100%"}>
            <Chip label={t("upcoming")} color={fetchEventMode === "upcoming" ? "primary" : "default"}
                  onClick={() => switchEventFetching("upcoming")}/>
            <Chip sx={{ml: 2}} label={t("past")} color={fetchEventMode === "past" ? "primary" : "default"}
                  onClick={() => switchEventFetching("past")}/>
        </Grid>
        <InfiniteScrollList fetch={(page) => fetchEvents(fetchEventMode, page, 20)}
                            loading={loading}
                            endReached={endReached}>
            {
                events.map((event) => <div key={event.id}>
                    <EventItem
                        event={event}
                        t={t}
                        attendanceUpdating={event.attendanceUpdating}
                        attendEvent={() => updateAttendance(event.id, "Attending", event.userAttendance)}
                        declineEvent={() => updateAttendance(event.id, "Declined", event.userAttendance)}
                        onClick={() => {
                            navigate("/training/event/" + event.id);
                        }}/>
                    <Divider/>
                </div>)
            }
        </InfiniteScrollList>
        {
            can("edit", "training") &&
            <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px"}}
                 onClick={() => navigate("/training/createOrUpdate/InsertEvent")}>
                {
                    <AddIcon sx={{color: "white"}}/>
                }
            </Fab>
        }
        {
            can("edit", "training") &&
            <Fab sx={{background: "#66bb6a", position: "fixed", right: "88px", bottom: "56px", mb: "16px"}}
                 onClick={() => navigate("/training/recurringEvents")}>
                {
                    <EventRepeat sx={{color: "white"}}/>
                }
            </Fab>
        }

        <AlertSnackbar alertInfo={error} close={() => dispatch(onEventErrorRead(null))}/>
    </Grid>);
}

export default EventScreen;
