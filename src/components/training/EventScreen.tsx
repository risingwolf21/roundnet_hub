import { Alert, Divider, Fab, Grid, LinearProgress, Snackbar } from "@mui/material";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from 'react-router-dom';
import { fetchEventsAsync, onEventErrorRead, updateAttendanceAsync } from "../../redux/eventSlice";
import AddIcon from '@mui/icons-material/Add';
import { useClient } from "react-supabase";
import React, { useState, useEffect } from "react";
import { InfiniteScrollList } from "../InfiniteScrollList";
import CustomAppBar from "../AppBar";
import { EventAttendance, FullEvent, User } from "../../types/supabaseTypes";
import { RootState } from "../../redux/store";
import { useAppDispatch } from "../..";
import { useDependency } from "../../hooks/useDependency";
import { IEventRepository } from "../../repository/IEventRepository";
import { EventItem } from "./EventItem";
import { AlertSnackbar } from "../AlertSnackbar";

export const EventScreenProvider = () => {
    const { items: events, userGroups, loading, error, endReached } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.application);
    const repository = useDependency<IEventRepository>("IEventRepository");

    if (!user || !repository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />
    else
        return <EventScreen
            events={events}
            userGroups={userGroups}
            loading={loading}
            error={error ?? ""}
            endReached={endReached}
            user={user}
            repository={repository}
        />
}

type EventScreenProps = {
    events: FullEvent[],
    userGroups: number[],
    loading: boolean,
    error: string,
    endReached: boolean,
    repository: IEventRepository,
    user: User
}

const EventScreen = ({ events, userGroups, loading, error, endReached, repository, user }: EventScreenProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [eventsUpdatingAttendance, setEventsUpdatingAttendance] = useState<number[]>([]);

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
        <CustomAppBar onRefresh={() => fetchEvents(0, 20)} />
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
