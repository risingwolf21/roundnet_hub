import AddIcon from '@mui/icons-material/Add';
import {Alert, Divider, Fab, Grid, LinearProgress, Snackbar} from "@mui/material";
import React, {useEffect} from "react";
import {useNavigate} from 'react-router-dom';
import {useClient} from "react-supabase";
import {useAppDispatch} from "../../redux/store";
import {EventAttendance, EventUpdate} from "../../types/supabaseTypes";
import CustomAppBar from "../AppBar";
import {InfiniteScrollList} from "../InfiniteScrollList";
import {EventItem} from "./EventItem";
import {EventScreenProps} from './types';
import {fetchEventsAsync, onEventDelete, onEventErrorRead, onEventUpdate} from 'src/redux/events/eventsSlice';
import {updateAttendanceAsync} from 'src/redux/events/eventAttendanceSlice';
import {can} from "../../utils/PermissionService";

const EventScreen = ({ events, loading, error, endReached, repository, user }: EventScreenProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        let subscription = client.channel("public:drink")
            .on<EventUpdate>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload.new)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload.old.id)))
            // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch]);

    useEffect(() => {
        dispatch(fetchEventsAsync({ user, page: 0, count: 20, repository }));
    }, [dispatch, user, repository]);

    const fetchEvents = (page: number, count: number) => {
        dispatch(fetchEventsAsync({ user, page, count, repository }));
    }

    const updateAttendance = async (eventId: number, state: EventAttendance, oldState: EventAttendance) => {
        dispatch(updateAttendanceAsync({ repository, user, eventId, state, oldState }));
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
                events.map((event) => <div key={event.id}>
                    <EventItem
                        event={event}
                        attendanceUpdating={event.attendanceUpdating}
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
            can("edit", "training") &&
            <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px"}}
                                          onClick={() => navigate("/training/createOrUpdate/InsertEvent")}>
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
