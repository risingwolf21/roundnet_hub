import {TFunction} from "i18next";
import {AnyAction, ThunkDispatch} from "@reduxjs/toolkit";
import {RootState} from "src/redux/store";
import {FullAttendance, FullComment, FullEvent, FullItemHolder, Group, User} from "src/types/supabaseTypes";
import {SliceEvent} from "src/features/events/slices/eventsSlice";

export type CreateEventOption = "UpdateSingle" | "UpdateRecurrence" | "InsertEvent";

export type CreateEventProps = {
    t: TFunction,
    eventToEdit: FullEvent | null,
    option: CreateEventOption
}

export type PlaceType = {
    name: string,
    lat: number,
    lon: number
}

export type SearchPlacesDialogProps = {
    open: boolean,
    handleClose: () => void,
    placeSelected: (place: PlaceType) => void
}

export type EventInformationProps = {
    selectedEvent: SliceEvent,
    attendanceLoading: boolean,
    attendance: FullAttendance[],
    comments: FullComment[],
    commentsLoading: boolean,
    error: string | null,
    user: User,
    dispatch: ThunkDispatch<RootState, undefined, AnyAction>,
    selectedEventPlace: PlaceType | null,
    keyHolders: FullItemHolder[],
    t: TFunction
}

export type EventAttendanceDialogProps = {
    open: boolean,
    index: number,
    setOpen: (value: boolean) => void,
    attendance: FullAttendance[],
    hasWaitingList: boolean
}

export type SelectGroupDialogProps = {
    open: boolean,
    handleClose: () => void,
    handleSubmit: (group: Group) => void
}

export type DeleteEventType = "This Event" | "This and following events";

export enum DeletionType {
    ThisEvent,
    ThisAndFollowingEvents
}

export type DeleteEventDialogProps = {
    open: boolean,
    setOpen: () => void,
    handleClose: (result: DeleteEventType | null) => any,
    selectedEvent: SliceEvent
}

export type EditEventOptionsDialogProps = {
    open: boolean,
    setOpen: () => void,
    handleClose: (result: CreateEventOption | null) => any,
}