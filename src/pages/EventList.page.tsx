import React from "react";
import {useSelector} from "react-redux";
import {can} from 'src/utils/PermissionService';
import {RootState} from "../redux/store";
import {AlertSnackbar} from "../components/AlertSnackbar";
import EventScreen from '../features/events/EventList';
import {eventsSelector} from "src/features/events/slices/eventsSlice";

const EventScreenProvider = () => {
    const {loading, error, endReached} = useSelector((state: RootState) => state.events);
    const events = useSelector(eventsSelector.selectAll)
    const {user} = useSelector((state: RootState) => state.application);

    if (!can("view", "training"))
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "No permission to view this screen", severity: "error"}}/>

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <EventScreen
        events={events}
        loading={loading}
        error={error ? {message: error, severity: "error"} : null}
        endReached={endReached}
        user={user}/>
}

export default EventScreenProvider;