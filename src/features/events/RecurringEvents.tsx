import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { SupabaseEventRepository } from '@/repository/EventRepository';
import {
  CalendarMonth,
  Edit,
  EventBusyRounded,
  GroupRounded,
  Key,
  PersonOffRounded,
  Place,
  PlayCircle,
  Repeat,
  Stop,
  StopCircleRounded,
  WatchLaterRounded,
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useDialogs } from '@toolpad/core';
import { format } from 'date-fns';
import React from 'react';
import Layout from '../../components/layout/Layout';
import { EventWithGroup } from '../../types/supabaseTypes';
import { nameOfRecurrence } from '../../utils';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';
import { PlaceType } from './types';

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: 'rotate(0deg)',
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: 'rotate(180deg)',
      },
    },
  ],
}));

type RecurringEventsProps = {
  recurringEvents: EventWithGroup[];
  loading: boolean;
};

const RecurringEventsProvider = () => {
  const {
    data: recurringEvents = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['events', 'recurring'],
    queryFn: () => SupabaseEventRepository.fetchRecurringEvents(),
  });

  return (
    <Layout appBarConfig={{ navigateBackPath: '/training/list' }}>
      <PullToRefresh onRefresh={() => refetch()}>
        <RecurringEvents recurringEvents={recurringEvents} loading={isLoading} />
      </PullToRefresh>
    </Layout>
  );
};

const RecurringEvents = ({ recurringEvents, loading }: RecurringEventsProps) => {
  const dialogs = useDialogs();
  const [expanded, setExpanded] = React.useState(-1);

  const handleExpandClick = (index: number) => {
    if (expanded === index) setExpanded(-1);
    else setExpanded(index);
  };

  return (
    <Layout appBarConfig={{ navigateBackPath: '/training/list' }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
      <Grid container rowSpacing={2} sx={{ width: '100%', p: 1 }}>
        {recurringEvents.map((x, index) => (
          <Grid size={{ xs: 12, md: 12 }} key={x.id}>
            <Box sx={{ display: 'flex' }}>
              <Card elevation={4} sx={{ width: '100%' }}>
                <CardHeader
                  title={x.title}
                  subheader={x.description}
                  titleTypographyProps={{
                    fontSize: '14pt',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  subheaderTypographyProps={{
                    fontSize: '10pt',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  sx={{
                    '& .MuiCardHeader-content': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  action={<Chip icon={<CalendarMonth />} label={format(x.startingDateTime, 'EEEE')} />}
                />
                <CardContent>
                  <Grid>
                    <Grid size={{ xs: 12, md: 12 }}>
                      <Stepper alternativeLabel activeStep={4}>
                        {x.answerDeadline && (
                          <Step key={'deadline'}>
                            <StepLabel icon={<EventBusyRounded color={'primary'} />}>
                              <b>Deadline</b>
                              <br></br>
                              {format(x.answerDeadline, 'EEEE')}
                              <br></br>
                              {format(x.answerDeadline, 'HH:mm')}
                            </StepLabel>
                          </Step>
                        )}
                        {x.meetingDateTime && (
                          <Step key={'meeting'}>
                            <StepLabel icon={<WatchLaterRounded color={'primary'} />}>
                              <b>Treffen</b>
                              <br></br>
                              {format(x.meetingDateTime, 'EEEE')}
                              <br></br>
                              {format(x.meetingDateTime, 'HH:mm')}
                            </StepLabel>
                          </Step>
                        )}
                        {x.startingDateTime && (
                          <Step key={'start'}>
                            <StepLabel icon={<PlayCircle color={'primary'} />}>
                              <b>Start</b>
                              <br></br>
                              {format(x.startingDateTime, 'EEEE')}
                              <br></br>
                              {format(x.startingDateTime, 'HH:mm')}
                            </StepLabel>
                          </Step>
                        )}
                        {x.endDateTime && (
                          <Step key={'end'}>
                            <StepLabel icon={<StopCircleRounded color={'primary'} />}>
                              <b>Ende</b>
                              <br></br>
                              {format(x.endDateTime, 'EEEE')}
                              <br></br>
                              {format(x.endDateTime, 'HH:mm')}
                            </StepLabel>
                          </Step>
                        )}
                      </Stepper>
                    </Grid>
                    <Divider sx={{ mt: 2, mb: 2 }} />
                    <Grid size={{ xs: 12, md: 12 }}>
                      <Grid container rowSpacing={2} columnSpacing={2}>
                        <Grid>
                          <Chip icon={<Repeat />} label={nameOfRecurrence(x.recurrence)} />
                        </Grid>
                        {x.recurrenceEnd && (
                          <Grid>
                            <Chip icon={<Stop />} label={format(x.recurrenceEnd, 'dd.MM.yyyy HH:mm')} />
                          </Grid>
                        )}
                        <Grid>
                          <Chip
                            icon={<GroupRounded style={{ color: x.fullGroup?.color }} />}
                            label={x.fullGroup?.name}
                          />
                        </Grid>
                        <Grid>
                          {
                            <Chip
                              icon={<PersonOffRounded />}
                              label={x.maxAttendees && x.maxAttendees > 0 ? x.maxAttendees : 'Keine Begrenzung'}
                            />
                          }
                        </Grid>
                        <Grid>
                          {x.place && (
                            <Chip icon={<Place />} label={(JSON.parse(x.place?.toString() ?? '') as PlaceType).name} />
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions disableSpacing>
                  <Button
                    startIcon={<Edit />}
                    onClick={async () => {
                      await dialogs.open(CreateOrUpdateEventDialog, {
                        event: x,
                        eventGroup: x.fullGroup,
                        option: 'UpdateRecurrence',
                      });
                    }}
                  >
                    Bearbeiten
                  </Button>
                  <ExpandMore
                    expand={expanded === index}
                    onClick={() => handleExpandClick(index)}
                    aria-label="show more"
                  >
                    <ExpandMoreIcon />
                  </ExpandMore>
                </CardActions>
                <Collapse in={expanded === index} timeout="auto" unmountOnExit>
                  <List sx={{ width: '100%' }}>
                    <ListItem>
                      <ListItemAvatar>
                        <Key />
                      </ListItemAvatar>
                      <ListItemText primary={x.key} />
                    </ListItem>
                  </List>
                </Collapse>
              </Card>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Layout>
  );
};
export default RecurringEventsProvider;
