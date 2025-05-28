import { TFunction } from 'i18next';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from 'src/redux/store';
import { FullAttendance, FullComment, UserWithRolesAndPermissions } from 'src/types/supabaseTypes';

export type CreateEventOption = 'UpdateSingle' | 'UpdateRecurrence' | 'InsertEvent';

export type CreateEventProps = {
  t: TFunction;
  eventToEdit: FullEvent | null;
  option: CreateEventOption;
};

export type PlaceType = {
  name: string;
  lat: number;
  lon: number;
};

export type SearchPlacesDialogProps = {
  open: boolean;
  handleClose: () => void;
  placeSelected: (place: PlaceType) => void;
};

export type EventAttendanceDialogProps = {
  open: boolean;
  index: number;
  setOpen: (value: boolean) => void;
  attendance: FullAttendance[];
  hasWaitingList: boolean;
  usersWithRequiredItem: { user: string; item: Item }[];
  acceptAttendance: (value: FullAttendance) => void;
};

export type SelectGroupDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleSubmit: (group: Group) => void;
};

export type DeleteEventType = 'This Event' | 'This and following events';

export enum DeletionType {
  ThisEvent,
  ThisAndFollowingEvents,
}