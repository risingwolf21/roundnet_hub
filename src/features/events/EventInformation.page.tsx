import {
  useEvent
} from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { captureException } from '@sentry/react';
import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { PlaceType } from './types';

import { EventInformation as EventInformationComp, EventInformationError, EventInformationSkeleton } from './EventInformation';

const EventInformation = () => {
  const { selectedEventId } = useParams();

  const { t } = useTranslation();

  const { data: event, isLoading } = useEvent(selectedEventId);
  const { data: keyHolders = [], isLoading: keyHoldersLoading } = useAllItems();

  const selectedEventPlace = useMemo<PlaceType | null>(() => {
    if (event && event.place) {
      try {
        const parsed = JSON.parse(event.place.toString());
        const place: PlaceType = {
          name: parsed.name || parsed.label,
          description: parsed.description || null,
          lat: parsed.lat,
          lon: parsed.lon,
        };
        return place;
      } catch (error) {
        captureException(error, (scope) => {
          scope.clear();
          scope.setExtra('place', JSON.stringify(event.place));
          scope.setExtra('event', JSON.stringify(event));
          return scope;
        });
        return null;
      }
    } else {
      return null;
    }
  }, [event]);

  if (isLoading || keyHoldersLoading) {
    return <EventInformationSkeleton />
  }

  if (!event) {
    return <EventInformationError />
  }

  return <EventInformationComp
    event={event}
    selectedEventPlace={selectedEventPlace}
    t={t}
    keyHolders={keyHolders}
  />

};

export default EventInformation;
