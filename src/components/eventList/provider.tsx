import React, { } from "react";
import { useSelector } from "react-redux";
import { Navigate } from 'react-router-dom';
import { can } from 'src/utils/PermissionService';
import { useDependency } from "../../hooks/useDependency";
import { RootState } from "../../redux/store";
import { IEventRepository } from "../../repository/IEventRepository";
import { AlertSnackbar } from "../AlertSnackbar";
import EventScreen from '.';
import { eventsSelector } from "src/redux/events/eventsSlice";

const EventScreenProvider = () => {
    const { loading, error, endReached } = useSelector((state: RootState) => state.events);
    const events = useSelector(eventsSelector.selectAll)
    const { user } = useSelector((state: RootState) => state.application);
    const repository = useDependency<IEventRepository>("IEventRepository");

    let test = Object.values(events).filter(x => x !== null || x != undefined)
    if (!can("view", "training"))
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "No permission to view this screen", severity: "error" }} />

    if (!user || !repository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />
    else
        return <EventScreen
            events={events}
            loading={loading}
            error={error ?? ""}
            endReached={endReached}
            user={user}
            repository={repository} />
}

export default EventScreenProvider;