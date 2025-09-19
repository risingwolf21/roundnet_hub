import { answerDeadlineExpired, eventInThePast, EventsUserView } from '@/types/supabaseTypes';
import { AccessTime, Place, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import {
  Badge,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';

export const EventCard = ({
  index,
  event,
  user,
  updateAttendance,
}: {
  index: number;
  event: EventsUserView;
  user: User;
  updateAttendance?: (user: User, event: EventsUserView, newState: EventAttendance) => void;
}) => {
  const navigate = useNavigate();

  return (
    <Card
      key={index}
      elevation={3}
      sx={{
        width: 200,
        flexShrink: 0,
      }}
    >
      <CardActionArea onClick={() => navigate('/training/event/' + event.id)}>
        <CardHeader
          sx={{ pb: 1 }}
          title={event.title}
          titleTypographyProps={{
            fontSize: '1.2rem',
            whiteSpace: 'nowrap',
            overflow: 'clip',
            textOverflow: 'ellipsis',
          }}
        />

        <CardContent sx={{ pt: 1 }}>
          <ListItem disablePadding dense>
            <ListItemAvatar sx={{ display: 'flex', minWidth: '40px' }}>
              <AccessTime />
            </ListItemAvatar>
            <ListItemText primary={format(event.startingDateTime, 'EEE dd.MM HH:mm')} />
          </ListItem>
          {event.place && (
            <ListItem disablePadding dense>
              <ListItemAvatar sx={{ display: 'flex', minWidth: '40px' }}>
                <Place />
              </ListItemAvatar>
              <ListItemText
                primary={JSON.parse(event.place!)['name']}
                slotProps={{
                  primary: {
                    whiteSpace: 'nowrap',
                    overflow: 'clip',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            </ListItem>
          )}
        </CardContent>
      </CardActionArea>
      {updateAttendance && (
        <CardActions disableSpacing sx={{ justifyContent: 'start' }}>
          <IconButton
            onClick={(e) => {
              updateAttendance(user, event, 'Declined');
              e.stopPropagation();
            }}
            disabled={event.isCancelled || eventInThePast(event)}
          >
            <Badge badgeContent={event.declined_count ?? 0} color="error">
              {event.user_state === 'Declined' ? (
                <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
              ) : (
                <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
              )}
            </Badge>
          </IconButton>
          <IconButton
            onClick={(e) => {
              updateAttendance(user, event, 'Attending');
              e.stopPropagation();
            }}
            disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
          >
            <Badge badgeContent={event.attending_count ?? 0} color="success">
              {event.user_state === 'Attending' ? (
                <ThumbUpAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
              ) : (
                <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
              )}
            </Badge>
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};
