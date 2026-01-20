import { EventsUserView, answerDeadlineExpired } from '@/types/supabaseTypes';
import { TFunction } from 'i18next';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

type Props = {
  event: EventsUserView;
  t: TFunction;
};

const EventAlerts = ({ event, t }: Props) => (
  <>
    {(answerDeadlineExpired(event) || event.isCancelled) && (
      <Stack direction={'column'} spacing={2} sx={{ m: 1 }}>
        {event.isCancelled && (
          <Alert severity="error">
            Dieses Event wurde <strong>abgesagt</strong>
          </Alert>
        )}
        {answerDeadlineExpired(event) && event.answerDeadline && (
          <Alert severity="info">
            {t('events.information.answerDeadlineExceeded', {
              answerDeadline: new Date(event.answerDeadline),
            })}
          </Alert>
        )}
      </Stack>
    )}
  </>
);

export default EventAlerts;
