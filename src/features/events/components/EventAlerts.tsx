import { Alert } from '@mui/material';
import { EventsUserView, answerDeadlineExpired } from 'src/types/supabaseTypes';
import { TFunction } from 'i18next';
import React from 'react';

type Props = {
  event: EventsUserView;
  t: TFunction;
};

const EventAlerts = ({ event, t }: Props) => (
  <>
    {event.isCancelled && !answerDeadlineExpired(event) && (
      <Alert sx={{ mt: 2, mx: 2 }} severity="error">
        Dieses Event wurde <strong>abgesagt</strong>
      </Alert>
    )}
    {answerDeadlineExpired(event) && event.answerDeadline && (
      <Alert sx={{ mt: 2, mx: 2 }} severity="info">
        {t('events.information.answerDeadlineExceeded', {
          answerDeadline: new Date(event.answerDeadline),
        })}
      </Alert>
    )}
  </>
);

export default EventAlerts;