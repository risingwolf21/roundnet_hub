import { Box, Typography } from "@mui/material";
import { toInteger, toNumber } from "lodash";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import { useDependency } from "src/hooks/useDependency";
import { IEventRepository } from "src/repository/IEventRepository";
import { fetchSingleEventAsync } from "../../redux/eventSlice";
import { RootState, useAppDispatch } from "../../redux/store";
import { FullEvent } from "../../types/supabaseTypes";
import EventInformation from ".";
import { PlaceType } from "../eventCreation/types";
import LoadingEventInfo from "./LoadingEventInfo";
import { AlertSnackbar } from "../AlertSnackbar";

const EventInformationProvider = () => {
    const { items, error, attendanceLoading, loading } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.application);
    const { selectedEventId } = useParams();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [selectedEvent, setSelectedEvent] = useState<FullEvent>();
    const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);
    const repository = useDependency<IEventRepository>("IEventRepository");

    useEffect(() => {
        if (!repository || !user)
            return;
        let found = items.find(x => x.id === toInteger(selectedEventId));
        if (!found) {
            dispatch(fetchSingleEventAsync({ repository, eventId: toNumber(selectedEventId), userId: user.userId }));
        } else {
            setSelectedEvent(found);
            setSelectedEventPlace(found.place ? JSON.parse(found.place?.toString() ?? "") as PlaceType : null)
        }
    }, [items, selectedEventId, dispatch, repository, user]);

    if (loading)
        return <LoadingEventInfo />

    if (!selectedEvent || !repository || !user)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository, user or selectedEvent was null!", severity: "error" }} />

    return <EventInformation
        t={t}
        selectedEvent={selectedEvent}
        selectedEventPlace={selectedEventPlace}
        repository={repository}
        attendanceLoading={attendanceLoading}
        error={error}
        user={user}
        dispatch={dispatch} />
}

export default EventInformationProvider;