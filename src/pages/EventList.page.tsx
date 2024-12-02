import React from "react";
import {useSelector} from "react-redux";
import {can} from 'src/utils/PermissionService';
import {RootState} from "../redux/store";
import {AlertSnackbar} from "../components/AlertSnackbar";
import EventScreen from '../features/events/EventList';
import {eventsSelector} from "src/features/events/slices/eventsSlice";
import {useAuth} from "../features/auth/AuthContext";

const EventScreenProvider = () => {
    const {loading, error, endReached} = useSelector((state: RootState) => state.events);
    const events = useSelector(eventsSelector.selectAll)
    const user = useAuth();

    if (!can("select", "event"))
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "No permission to view this screen", severity: "error"}}/>

    return <EventScreen
        events={events}
        loading={loading}
        error={error ? {message: error, severity: "error"} : null}
        endReached={endReached}
        user={user}/>
}

export default EventScreenProvider;