import { PullToRefresh } from '@/components/PullToRefresh';
import { format, isAfter, parse } from 'date-fns';
import { eventInThePast, EventWithGroup } from '../../types/supabaseTypes';

import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useCreateNextOccurences, useRecurringEvents } from '@/tanstack/events';
import groupBy from 'lodash.groupby';
import { Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { formatDateRange } from './components/EventItem';
import { PlaceType } from './types';

const RecurringEventsShadcn = () => {
  const { user } = useGrants();

  const navigate = useNavigate();
  const { data: recurringEvents = [], isLoading, refetch } = useRecurringEvents();
  const createNextEvents = useCreateNextOccurences();

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={"Eventdetails"}
        primaryAction="back"
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="mx-auto max-w-2xl w-full p-4 space-y-4">

            <Item variant={"outline"}>
              <ItemContent>
                <ItemTitle>Wiederkehrende Events</ItemTitle>
                <ItemDescription>Hier kannst du wiederkehrende Events für die nächsten 30 Tage erstellen lassen</ItemDescription>
                {
                  (createNextEvents.data ?? []).length > 0 && <ol className='list-decimal pl-6 pt-2'>
                    {
                      createNextEvents.data?.map(x => (
                        <li key={x.id} className='text-sm text-muted-foreground'>
                          {`Event "${x.title}" am ${format(new Date(x.startingDateTime!), 'dd.MM.yyyy, HH:mm')} wurde erstellt.`}
                        </li>
                      ))
                    }
                  </ol>
                }
              </ItemContent>
              <ItemActions>
                <Button variant={"outline"} disabled={createNextEvents.isPending} onClick={() => {
                  createNextEvents.mutate(undefined, {
                    onSuccess: (data) => toast.success(`Es wurden erfolgreich ${data.length} Events erstellt!`),
                    onError: () => toast.error("Es ist ein Fehler aufgetreten beim Erstellen der Events!")
                  });
                }}>
                  {
                    createNextEvents.isPending ? <Spinner /> : "Erstellen"
                  }
                </Button>
              </ItemActions>
            </Item>

            {Object.entries(groupBy(recurringEvents, (x) => format(x.startingDateTime!, 'EEEE')))
              .sort((a, b) =>
                isAfter(
                  parse(a[0], 'EEEE', new Date(), { weekStartsOn: 1 }),
                  parse(b[0], 'EEEE', new Date(), { weekStartsOn: 1 })
                )
                  ? 1
                  : -1
              )
              .map(([key, value]: [string, EventWithGroup[]]) => (
                <div key={key} className="flex w-full gap-2 flex-col">
                  <div className="text-sm font-semibold ml-2">
                    {key}
                  </div>
                  <div className='flex flex-col gap-2'>
                    {value.map((event: EventWithGroup) => {
                      const place = event.place ? JSON.parse(event.place) as PlaceType : null;
                      return <Item key={event.id} onClick={() => navigate(`/training/event/${event.id}`)} variant={"outline"}>
                        <div
                          className={cn('w-full flex flex-row justify-between gap-2 relative rounded-md text-sm', {
                            'cursor-not-allowed opacity-50': event.isCancelled || eventInThePast(event),
                          })}
                        >
                          <div className='flex-1 min-w-0'>
                            <div className='font-semibold text-medium truncate'>
                              {event.title}
                            </div>

                            {
                              place && (
                                <div className='text-muted-foreground leading-7 flex items-center gap-2 min-w-0'>
                                  <MapPin className='size-4 shrink-0' />
                                  <span className='truncate'>
                                    {place.name ?? 'Kein Ort angegeben'}
                                  </span>
                                </div>
                              )
                            }

                            <div className='text-muted-foreground leading-7 flex items-center gap-2 min-w-0'>
                              <Calendar className='size-4 shrink-0' />
                              <span className='truncate'>
                                {formatDateRange(new Date(event.startingDateTime), new Date(event.endDateTime))}
                              </span>
                            </div>
                          </div>

                        </div>
                      </Item>
                    }

                      // <ListItem
                      //   key={event.key}
                      //   divider={true}
                      //   onClick={() =>
                      //     console.log(
                      //       getWeek(event.startingDateTime, { weekStartsOn: 1 }),
                      //       getWeek(new Date(), { weekStartsOn: 1 })
                      //     )
                      //   }
                      //   secondaryAction={
                      //     <Stack direction="column" spacing={1}>
                      //       <Chip
                      //         icon={<GroupIcon sx={{ color: event.fullGroup.color }} />}
                      //         label={event.fullGroup.name}
                      //         size="small"
                      //       />
                      //       <Chip
                      //         icon={<PlaceIcon />}
                      //         label={
                      //           event.place
                      //             ? (JSON.parse(event.place ?? "{'name': 'Unkown place'}")?.name?.split(' ')[0] ?? '')
                      //             : 'Unkown place'
                      //         }
                      //         size="small"
                      //       />
                      //     </Stack>
                      //   }
                      // >
                      //   <ListItemText
                      //     primary={event.title}
                      //     slotProps={{
                      //       primary: {
                      //         whiteSpace: 'nowrap',
                      //         overflow: 'clip',
                      //         textOverflow: 'ellipsis',
                      //       },
                      //       secondary: {
                      //         whiteSpace: 'nowrap',
                      //         overflow: 'clip',
                      //         textOverflow: 'ellipsis',
                      //       },
                      //     }}
                      //     secondary={
                      //       <Stack direction="column">
                      //         <Typography fontSize={14}>
                      //           {[
                      //             t('events.secondaryTextStart', { start: toDate(event.startingDateTime!) }),
                      //             event.endDateTime && t('events.secondaryTextWithEnd', { end: toDate(event.endDateTime) }),
                      //           ].join(' ') +
                      //             ' - ' +
                      //             format(event.startingDateTime, 'dd.MM.yyyy')}
                      //         </Typography>
                      //         <Typography fontSize={14}>
                      //           {event.recurrence === 'Fortnightly'
                      //             ? 'Alle 2 Wochen'
                      //             : event.recurrence === 'Weekly'
                      //               ? 'Wöchentlich'
                      //               : 'Einmalig'}
                      //         </Typography>
                      //       </Stack>
                      //     }
                      //   />
                      // </ListItem>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default RecurringEventsShadcn;
