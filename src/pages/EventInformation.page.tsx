import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useSelector} from "react-redux";
import {useParams} from "react-router-dom";
import {RootState, useAppDispatch} from "../redux/store";
import EventInformation from "../features/events/EventInformation";
import LoadingEventInfo from "../features/events/components/LoadingEventInfo";
import {AlertSnackbar} from "../components/AlertSnackbar";
import {
    eventsSelector,
    fetchSingleEventAsync,
    onEventDelete,
    onEventUpdate
} from "src/features/events/slices/eventsSlice";
import {
    attendanceSelector,
    onEventAttendanceDelete,
    onEventAttendanceUpdate
} from "src/features/events/slices/eventAttendanceSlice";
import {eventsCommentsSelector} from "src/features/events/slices/eventCommentsSlice";
import {useClient} from "react-supabase";
import {fetchItemsAsync, keyHoldersSelector} from "../features/keys/slices/keysSlice";
import {TablesUpdate} from "../types/supabase-generated.types";
import {PlaceType} from "../features/events/types";
import {useAuth} from "../features/auth/AuthContext";

const EventInformationProvider = () => {
    const {selectedEventId} = useParams();
    const {error, loading} = useSelector((state: RootState) => state.events);
    const attendance = useSelector((state: RootState) => attendanceSelector.selectById(state.eventAttendance, selectedEventId ?? ""));
    const comments = useSelector((state: RootState) => eventsCommentsSelector.selectById(state.eventComments, selectedEventId ?? ""));
    const event = useSelector((state: RootState) => eventsSelector.selectById(state, selectedEventId ?? ""));
    const {loading: attendanceLoading} = useSelector((state: RootState) => state.eventAttendance);
    const {loading: commentsLoading} = useSelector((state: RootState) => state.eventComments);
    const keyHolders = useSelector((state: RootState) => keyHoldersSelector.selectAll(state));
    const user = useAuth();
    const dispatch = useAppDispatch();
    const client = useClient();
    const {t} = useTranslation();
    const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);

    useEffect(() => {
        dispatch(fetchItemsAsync());

        if (!event)
            return;

        let subscription = client.channel("public:event_attendance_user_mapping")
            .on<TablesUpdate<'event_attendance_user_mapping'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'event_attendance_user_mapping'
            }, payload => dispatch(onEventAttendanceUpdate({...(payload.new), userId: user.userId})))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'event_attendance_user_mapping'
            }, payload => dispatch(onEventAttendanceDelete(payload.old.id)))
            // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .on<TablesUpdate<'events'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'events',
                filter: `id=eq.${event.id}`
            }, payload => dispatch(onEventUpdate(payload.new)))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'events',
                filter: `id=eq.${event.id}`
            }, payload => dispatch(onEventDelete(payload.old.id)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user, event]);

    useEffect(() => {
        if (!event) {
            dispatch(fetchSingleEventAsync({eventId: selectedEventId ?? "", userId: user.userId}));
        } else {
            setSelectedEventPlace(event.place ? JSON.parse(event.place?.toString() ?? "") as PlaceType : null)
        }
    }, [selectedEventId, dispatch, user, event]);

    if (loading)
        return <LoadingEventInfo/>

    if (!event)
        return <AlertSnackbar close={() => {
        }} alertInfo={{
            message: "Fatal error occured. Repository, user or selectedEvent was null!",
            severity: "error"
        }}/>

    return <EventInformation
        t={t}
        keyHolders={keyHolders}
        selectedEvent={event}
        selectedEventPlace={selectedEventPlace}
        attendance={attendance?.attendance ?? []}
        attendanceLoading={attendanceLoading}
        comments={comments?.comments ?? []}
        commentsLoading={commentsLoading}
        error={error}
        user={user}
        dispatch={dispatch}/>
}

export default EventInformationProvider;