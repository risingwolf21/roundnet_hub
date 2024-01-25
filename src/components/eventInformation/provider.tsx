import { toInteger, toNumber } from "lodash";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useDependency } from "src/hooks/useDependency";
import { IEventRepository } from "src/repository/IEventRepository";
import { RootState, useAppDispatch } from "../../redux/store";
import { FullEvent } from "../../types/supabaseTypes";
import EventInformation from ".";
import { PlaceType } from "../eventCreation/types";
import LoadingEventInfo from "./LoadingEventInfo";
import { AlertSnackbar } from "../AlertSnackbar";
import { SliceEvent, eventsSelector, fetchSingleEventAsync } from "src/redux/events/eventsSlice";
import { attendanceSelector } from "src/redux/events/eventAttendanceSlice";
import { eventsCommentsSelector } from "src/redux/events/eventCommentsSlice";

const EventInformationProvider = () => {
    const { selectedEventId } = useParams();
    const { error, loading } = useSelector((state: RootState) => state.events);
    const attendance = useSelector((state: RootState) => attendanceSelector.selectById(state.eventAttendance, toInteger(selectedEventId)));
    const comments = useSelector((state: RootState) => eventsCommentsSelector.selectById(state.eventComments, toInteger(selectedEventId)));
    const event = useSelector((state: RootState) => eventsSelector.selectById(state, toInteger(selectedEventId)));
    const { loading: attendanceLoading } = useSelector((state: RootState) => state.eventAttendance);
    const { loading: commentsLoading } = useSelector((state: RootState) => state.eventComments);
    const { user } = useSelector((state: RootState) => state.application);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);
    const repository = useDependency<IEventRepository>("IEventRepository");

    useEffect(() => {
        if (!repository || !user)
            return;
        if (!event) {
            dispatch(fetchSingleEventAsync({ repository, eventId: toNumber(selectedEventId), userId: user.userId }));
        } else {
            setSelectedEventPlace(event.place ? JSON.parse(event.place?.toString() ?? "") as PlaceType : null)
        }
    }, [selectedEventId, dispatch, repository, user]);

    if (loading)
        return <LoadingEventInfo />

    if (!event || !repository || !user)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository, user or selectedEvent was null!", severity: "error" }} />

    return <EventInformation
        t={t}
        selectedEvent={event}
        selectedEventPlace={selectedEventPlace}
        repository={repository}
        attendance={attendance?.attendance ?? []}
        attendanceLoading={attendanceLoading}
        comments={comments?.comments ?? []}
        commentsLoading={commentsLoading}
        error={error}
        user={user}
        dispatch={dispatch} />
}

export default EventInformationProvider;