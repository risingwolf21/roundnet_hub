import AddIcon from '@mui/icons-material/Add';
import { Alert, Divider, Fab, Grid, LinearProgress, Snackbar } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from 'react-router-dom';
import { useClient } from "react-supabase";
import { can } from 'src/utils/PermissionService';
import { useDependency } from "../../hooks/useDependency";
import { fetchEventsAsync, onEventDelete, onEventErrorRead, onEventInsert, onEventUpdate, updateAttendanceAsync } from "../../redux/eventSlice";
import { RootState, useAppDispatch } from "../../redux/store";
import { IEventRepository } from "../../repository/IEventRepository";
import { EventAttendance, FullEvent, User } from "../../types/supabaseTypes";
import { AlertSnackbar } from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import { InfiniteScrollList } from "../InfiniteScrollList";
import { EventItem } from "./EventItem";
import EventScreen from '.';

const EventScreenProvider = () => {
    const { items: events, userGroups, loading, error, endReached } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.application);
    const repository = useDependency<IEventRepository>("IEventRepository");

    if (!can("view", "training"))
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "No permission to view this screen", severity: "error" }} />

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
            repository={repository} />
}

export default EventScreenProvider;