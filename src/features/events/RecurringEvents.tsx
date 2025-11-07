import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { SupabaseEventRepository } from '@/repository/EventRepository';
import { useQuery } from '@tanstack/react-query';
import { format, getWeek, isAfter, parse, toDate } from 'date-fns';
import Layout from '../../components/layout/Layout';
import { EventWithGroup } from '../../types/supabaseTypes';

import GroupIcon from '@mui/icons-material/Group';
import PlaceIcon from '@mui/icons-material/Place';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import groupBy from 'lodash.groupby';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <List>
      {Object.entries(groupBy(recurringEvents, (x) => format(x.startingDateTime!, 'EEEE'))).sort((a, b) => isAfter(parse(a[0], 'EEEE', new Date(), { weekStartsOn: 1 }), parse(b[0], 'EEEE', new Date(), { weekStartsOn: 1 })) ? 1 : -1).map(([key, value]: [string, EventWithGroup[]]) => (
        <List subheader={<ListSubheader sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{key}</ListSubheader>}>
          {value.map((event: EventWithGroup) => (
            <ListItem
              key={event.key}
              divider={true}
              onClick={() => console.log(getWeek(event.startingDateTime, { weekStartsOn: 1 }), getWeek(new Date(), { weekStartsOn: 1 }))}
              secondaryAction={<Stack direction="column" spacing={1}>
                <Chip icon={<GroupIcon sx={{ color: event.fullGroup.color }} />} label={event.fullGroup.name} size="small" />
                <Chip icon={<PlaceIcon />} label={event.place ? JSON.parse(event.place ?? "{'name': 'Unkown place'}")?.name?.split(" ")[0] ?? '' : "Unkown place"} size="small" />
              </Stack>}
            >
              <ListItemText
                primary={event.title}
                slotProps={{
                  primary: {
                    whiteSpace: 'nowrap',
                    overflow: 'clip',
                    textOverflow: 'ellipsis',
                  },
                  secondary: {
                    whiteSpace: 'nowrap',
                    overflow: 'clip',
                    textOverflow: 'ellipsis',
                  },
                }}
                secondary={
                  <Stack direction="column">
                    <Typography fontSize={14}>
                      {
                        [
                          t('events.secondaryTextStart', { start: toDate(event.startingDateTime!) }),
                          event.endDateTime && t('events.secondaryTextWithEnd', { end: toDate(event.endDateTime) }),
                        ].join(' ') + " - " + format(event.startingDateTime, "dd.MM.yyyy")
                      }
                    </Typography>
                    <Typography fontSize={14}>
                      {event.recurrence === "Fortnightly" ? "Alle 2 Wochen" : event.recurrence === "Weekly" ? "Wöchentlich" : "Einmalig"}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          ))}
        </List>
      ))}
    </List>
  );
};
export default RecurringEventsProvider;
