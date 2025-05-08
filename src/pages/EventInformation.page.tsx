import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router';
import {
  attendanceSelector
} from 'src/features/events/slices/eventAttendanceSlice';
import { eventsCommentsSelector } from 'src/features/events/slices/eventCommentsSlice';
import {
  eventsSelector,
  fetchSingleEventAsync
} from 'src/features/events/slices/eventsSlice';
import { AlertSnackbar } from '../components/AlertSnackbar';
import { useApplication } from '../features/auth/AuthContext';
import EventInformation from '../features/events/EventInformation';
import { PlaceType } from '../features/events/types';
import { fetchItemsAsync, keyHoldersSelector } from '../features/keys/slices/keysSlice';
import { RootState, useAppDispatch } from '../redux/store';

const EventInformationProvider = () => {
  const { selectedEventId } = useParams();
  const { error, loading } = useSelector((state: RootState) => state.events);
  const attendance = useSelector((state: RootState) =>
    attendanceSelector.selectById(state.eventAttendance, selectedEventId ?? '')
  );
  const comments = useSelector((state: RootState) =>
    eventsCommentsSelector.selectById(state.eventComments, selectedEventId ?? '')
  );
  const event = useSelector((state: RootState) => eventsSelector.selectById(state, selectedEventId ?? ''));
  const { loading: attendanceLoading } = useSelector((state: RootState) => state.eventAttendance);
  const { loading: commentsLoading } = useSelector((state: RootState) => state.eventComments);
  const keyHolders = useSelector((state: RootState) => keyHoldersSelector.selectAll(state));
  const { user } = useApplication();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType | null>(null);

  useEffect(() => {
    dispatch(fetchItemsAsync());
  }, [dispatch]);

  useEffect(() => {
    if (!event) {
      dispatch(fetchSingleEventAsync({ eventId: selectedEventId ?? '', userId: user!.userId }));
    } else {
      setSelectedEventPlace(event.place ? (JSON.parse(event.place?.toString() ?? '') as PlaceType) : null);
    }
  }, [selectedEventId, dispatch, user, event]);

  if (!event)
    return (
      <AlertSnackbar
        close={() => { }}
        alertInfo={{
          message: 'Fatal error occured. Repository, user or selectedEvent was null!',
          severity: 'error',
        }}
      />
    );

  return (
    <EventInformation
      t={t}
      keyHolders={keyHolders}
      selectedEvent={event}
      selectedEventPlace={selectedEventPlace}
      attendance={attendance?.attendance ?? []}
      attendanceLoading={attendanceLoading}
      comments={comments?.comments ?? []}
      commentsLoading={commentsLoading}
      error={error}
      user={user!}
      dispatch={dispatch}
      loading={loading || commentsLoading || attendanceLoading}
    />
  );
};

export default EventInformationProvider;
