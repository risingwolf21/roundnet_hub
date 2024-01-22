import { TFunction } from "i18next";
import { IEventRepository } from "src/repository/IEventRepository";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { RootState } from "src/redux/store";
import { FullAttendance, FullComment, FullEvent, Group, User } from "src/types/supabaseTypes";
import { PlaceType } from "../eventCreation/types";
import { SliceEvent } from "src/redux/events/eventsSlice";

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
    repository: IEventRepository,
    t: TFunction
}

export type EventAttendanceDialogProps = {
    open: boolean,
    index: number,
    setOpen: (value: boolean) => void,
    attendance: FullAttendance[]
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