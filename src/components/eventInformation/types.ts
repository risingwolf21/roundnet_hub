import { TFunction } from "i18next";
import { IEventRepository } from "src/repository/IEventRepository";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { RootState } from "src/redux/store";
import { FullEvent, Group, User } from "src/types/supabaseTypes";
import { PlaceType } from "../eventCreation/types";

export type EventInformationProps = {
    selectedEvent: FullEvent,
    attendanceLoading: boolean,
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
    event: FullEvent
}

export type SelectGroupDialogProps = {
    open: boolean,
    handleClose: () => void,
    handleSubmit: (group: Group) => void
}

export type DeleteEventType = "This Event" | "This and following events";