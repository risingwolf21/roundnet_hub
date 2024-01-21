import AddIcon from '@mui/icons-material/Add';
import { Alert, Divider, Fab, Grid, LinearProgress, Snackbar } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useClient } from "react-supabase";
import { fetchEventsAsync, onEventDelete, onEventErrorRead, onEventInsert, onEventUpdate, updateAttendanceAsync } from "../../redux/eventSlice";
import { useAppDispatch } from "../../redux/store";
import { EventAttendance, EventInsert, EventUpdate } from "../../types/supabaseTypes";
import CustomAppBar from "../AppBar";
import { InfiniteScrollList } from "../InfiniteScrollList";
import { EventItem } from "./EventItem";
import { EventScreenProps } from './types';

const EventScreen = ({ events, userGroups, loading, error, endReached, repository, user }: EventScreenProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [eventsUpdatingAttendance, setEventsUpdatingAttendance] = useState<number[]>([]);

    useEffect(() => {
        let subscription = client.channel("public:drink")
            .on<EventUpdate>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload.new)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload.old.id)))
            .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch]);

    useEffect(() => {
        dispatch(fetchEventsAsync({ user, page: 0, count: 20, repository }));
    }, [dispatch, client, user, userGroups, repository]);

    const fetchEvents = (page: number, count: number) => {
        dispatch(fetchEventsAsync({ user, page, count, repository }));
    }

    const updateAttendance = async (eventId: number, state: EventAttendance, oldState: EventAttendance) => {
        setEventsUpdatingAttendance([...eventsUpdatingAttendance, eventId]);

        dispatch(updateAttendanceAsync({ repository, user, eventId, state, oldState }));

        setEventsUpdatingAttendance([...eventsUpdatingAttendance.filter(x => x === eventId)]);
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar />
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <InfiniteScrollList fetch={(page) => fetchEvents(page, 20)} error={error ?? ""} loading={loading} endReached={endReached}>
            {
                events && events.map((event, index) => <div key={"Drink" + index}>
                    <EventItem
                        event={event}
                        attendanceUpdating={eventsUpdatingAttendance.some(x => x === event.id)}
                        attendEvent={() => updateAttendance(event.id, "Attending", event.userAttendance)}
                        declineEvent={() => updateAttendance(event.id, "Declined", event.userAttendance)}
                        onClick={() => {
                            navigate("/training/event/" + event.id);
                        }} />
                    <Divider />
                </div>)
            }
        </InfiniteScrollList>
        {
            user?.role === "admin" && <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
                onClick={() => navigate("create")}>
                {
                    <AddIcon sx={{ color: "white" }} />
                }
            </Fab>
        }

        {
            error && <Snackbar sx={{ position: "fixed", right: "16px", }} open={true} >
                <Alert severity={"error"} sx={{ width: '100%' }} onClose={() => dispatch(onEventErrorRead(null))}>
                    {error}
                </Alert>
            </Snackbar>
        }
    </Grid >);
}

export default EventScreen;
