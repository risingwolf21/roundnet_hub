import {toInteger, toNumber} from "lodash";
import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useSelector} from "react-redux";
import {useParams} from "react-router-dom";
import {useDependency} from "src/hooks/useDependency";
import {IEventRepository} from "src/repository/IEventRepository";
import {RootState, useAppDispatch} from "../../redux/store";
import {EventAttendanceUpdate, EventUpdate} from "../../types/supabaseTypes";
import EventInformation from ".";
import {PlaceType} from "../eventCreation/types";
import LoadingEventInfo from "./LoadingEventInfo";
import {AlertSnackbar} from "../AlertSnackbar";
import {eventsSelector, fetchSingleEventAsync, onEventDelete, onEventUpdate} from "src/redux/events/eventsSlice";
import {
    attendanceSelector,
    onEventAttendanceDelete,
    onEventAttendanceUpdate
} from "src/redux/events/eventAttendanceSlice";
import {eventsCommentsSelector} from "src/redux/events/eventCommentsSlice";
import {useClient} from "react-supabase";

const EventInformationProvider = () => {
    const {selectedEventId} = useParams();
    const {error, loading} = useSelector((state: RootState) => state.events);
    const attendance = useSelector((state: RootState) => attendanceSelector.selectById(state.eventAttendance, toInteger(selectedEventId)));
    const comments = useSelector((state: RootState) => eventsCommentsSelector.selectById(state.eventComments, toInteger(selectedEventId)));
    const event = useSelector((state: RootState) => eventsSelector.selectById(state, toInteger(selectedEventId)));
    const {loading: attendanceLoading} = useSelector((state: RootState) => state.eventAttendance);
    const {loading: commentsLoading} = useSelector((state: RootState) => state.eventComments);
    const {keys: keyHolders} = useSelector((state: RootState) => state.keys);
    const {user} = useSelector((state: RootState) => state.application);
    const dispatch = useAppDispatch();
    const client = useClient();
    const {t} = useTranslation();
    const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);
    const repository = useDependency<IEventRepository>("IEventRepository");

    useEffect(() => {
        if (!user || !event)
            return;

        let subscription = client.channel("public:event_attendance_user_mapping")
            .on<EventAttendanceUpdate>('postgres_changes', {
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
            .on<EventUpdate>('postgres_changes', {
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
        if (!repository || !user)
            return;
        if (!event) {
            dispatch(fetchSingleEventAsync({repository, eventId: toNumber(selectedEventId), userId: user.userId}));
        } else {
            setSelectedEventPlace(event.place ? JSON.parse(event.place?.toString() ?? "") as PlaceType : null)
        }
    }, [selectedEventId, dispatch, repository, user, event]);

    if (loading)
        return <LoadingEventInfo/>

    if (!event || !repository || !user)
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
        repository={repository}
        attendance={attendance?.attendance ?? []}
        attendanceLoading={attendanceLoading}
        comments={comments?.comments ?? []}
        commentsLoading={commentsLoading}
        error={error}
        user={user}
        dispatch={dispatch}/>
}

export default EventInformationProvider;