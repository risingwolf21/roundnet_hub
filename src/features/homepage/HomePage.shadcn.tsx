import { useFetchMode } from '@/hooks/useFetchMode';
import { useDrinks, useInsertHistoryEntryMutation } from '@/tanstack/drinks';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { withProfiler } from '@sentry/react';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';

import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Has } from '@/hooks/useGrants';
import { answerDeadlineExpired, eventInThePast } from '@/types/supabaseTypes';
import CardContent from '@mui/material/CardContent';
import { format } from 'date-fns';
import { t } from 'i18next';
import { AlertTriangle, Calendar, Check, Clock, Image, Key, MapPin, Megaphone, Shapes, X } from 'lucide-react';
import { toast } from 'sonner';
import { PlaceType } from '../events/types';

const HomePageShadcn = () => {
  const [fetchMode] = useFetchMode();

  const { user, hasPerm } = useGrants();
  const { data: drinks = [], isLoading: isDrinksLoading, refetch: refetchDrinks } = useDrinks();
  const { data: events = [], isLoading: isEventsLoading, refetch: refetchEvents } = useEvents(fetchMode, 10);
  const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useAllItems();
  const navigate = useNavigate();

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);
  const updateHistory = useInsertHistoryEntryMutation(user);

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar
        className='!border-b !shadow-sm'
        title="Homepage"
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className='flex flex-col gap-4 p-4'>
          <Has feat={"events"}>
            <div className='flex flex-col gap-2'>
              <div className="text-base font-semibold ml-2">Events</div>
              <div className='flex flex-row gap-4 overflow-x-auto w-full py-2 px-1'>
                {
                  events.map(event => {

                    const isAttending = event.user_state === "Attending" || event.user_state === "AttendingAsTrainer" || event.user_state === "AttendingAsTrial";
                    const isWaiting = event.user_state === "RequestedAttendance" || event.user_state === "Waiting" || event.user_state === "WaitingAsTrial";
                    const place = event.place ? JSON.parse(event.place) as PlaceType : null
                    const date = format(event.startingDateTime, "PPPP").split(",").splice(0, 2).join(",")
                    const time = format(event.startingDateTime, "HH:mm") + " - " + format(event.endDateTime, "HH:mm")

                    return <Card key={event.id} className="shrink-0 w-50 flex flex-col h-full gap-0 snap-center border-t-6 border-t-[color:var(--attendance-color)]"
                      style={{ "--attendance-color": isAttending ? "var(--success)" : isWaiting ? "var(--warning)" : event.user_state === "Declined" ? "var(--error)" : "#000000" } as React.CSSProperties}>
                      <CardHeader onClick={() => {
                        navigate('/training/event/' + event.id)
                      }}>
                        <CardTitle className='truncate'>{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent className='gap-2 flex flex-col' onClick={() => {
                        navigate('/training/event/' + event.id)
                      }}>
                        <div className="flex items-start gap-3 text-sm text-foreground">
                          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium truncate">{date}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-foreground">
                          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium truncate">{time}</p>
                          </div>
                        </div>
                        {
                          place && <div className="flex items-start gap-3 text-sm text-foreground">
                            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium truncate">{place.name}</p>
                            </div>
                          </div>
                        }
                      </CardContent>
                      <CardFooter className='flex-row justify-between items-center w-full mt-auto p-2'>

                        {/* NEU: Anzeige der Zusagen/Absagen (Links) */}
                        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground pl-1">
                          {
                            ((event.attending_count ?? 0) > 0) && <div className="flex items-center gap-1" title="Zugesagt">
                              <Check className="size-3.5 text-success" />
                              <span>{event.attending_count}</span>
                            </div>
                          }
                          {
                            ((event.declined_count ?? 0) > 0) && <div className="flex items-center gap-1" title="Abgesagt">
                              <X className="size-3.5 text-muted-foreground/70" />
                              <span>{event.declined_count}</span>
                            </div>
                          }
                        </div>

                        <div className="flex flex-row gap-2">
                          <Button
                            variant={event.user_state === "Declined" ? "ghost" : "outline"}
                            size="icon-lg"
                            className={`size-9 ${event.user_state === "Declined" && "bg-error text-error-foreground"}`}
                            onClick={(e) => {
                              updateAttendance.mutate({ user, event, newState: "Declined" })
                              e.stopPropagation();
                            }}
                            disabled={event.isCancelled || eventInThePast(event)}
                          >
                            {
                              updateAttendance.isPending ? <Spinner /> : <X className='size-5' />
                            }
                          </Button>
                          <Button
                            variant={isAttending ? "ghost" : "outline"}
                            size="icon-lg"
                            className={`size-9 ${isAttending && "bg-success text-success-foreground"}`}
                            onClick={(e) => {
                              const newState: EventAttendance = event.user_group_role === "trial" ? "AttendingAsTrial" : "Attending"
                              updateAttendance.mutate({ user, event, newState })
                              e.stopPropagation();
                            }}
                            disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
                          >
                            {
                              updateAttendance.isPending ? <Spinner /> :
                                (event.user_state === "AttendingAsTrainer"
                                  ? <Megaphone className='size-5' />
                                  : event.user_state === "AttendingAsTrial"
                                    ? <Shapes className='size-5' />
                                    : <Check className='size-5' />)
                            }
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  })
                }
              </div>
            </div>
          </Has>

          <Has feat={"drinks"}>
            <div className='flex flex-col gap-2'>
              <div className="text-base font-semibold ml-2">Getränke</div>
              <div className='flex flex-row gap-4 overflow-x-auto w-full py-2 px-1'>
                {
                  drinks
                    .filter((x: Drink) => !x.deleted && x.active && x.type === 'Drink')
                    .map(drink => {

                      return <Card key={drink.id} className="shrink-0 w-50 flex flex-col h-full gap-0 pt-0 snap-center">
                        <CardHeader className='flex flex-row p-2 gap-4 items-center'>
                          <Avatar className="size-12">
                            <AvatarImage src={drink.imageUrl ?? undefined} />
                            <AvatarFallback>
                              <Image className="text-muted-foreground/50" />
                            </AvatarFallback>
                          </Avatar>
                          <CardTitle className='truncate text-base'>{drink.name}</CardTitle>
                        </CardHeader>

                        <CardFooter className='flex-row gap-2 justify-end w-full mt-auto py-1 px-2'>
                          <Button
                            variant={"outline"}
                            onClick={(e) => {
                              updateHistory.mutate(
                                { drinks: [{ ...drink, count: 1 }] },
                                {
                                  onSuccess: () => {
                                    toast.info('Getränk erfolgreich gebucht!');
                                  },
                                  onError: (error) => {
                                    toast.error(`Getränk konnte nicht gebucht werden. ${error.message}`);
                                  },
                                }
                              )
                              e.stopPropagation();
                            }}
                          >
                            {
                              updateHistory.isPending ? <Spinner /> : "Bestellen"
                            }
                          </Button>
                        </CardFooter>
                      </Card>
                    })
                }
              </div>
            </div>
          </Has>

          <Has feat={"items"}>
            <div className='flex flex-col gap-2'>
              <div className="text-base font-semibold ml-2">Schlüssel</div>
              <div className='flex flex-row gap-4 overflow-x-auto w-full py-2 px-1'>
                {
                  items
                    .map(item => {

                      const amICurrentHolder = item.current_holder === user.id;

                      return <Card key={item.id} className="shrink-0 w-50 flex flex-col h-full gap-0 snap-center border-t-6 border-t-[color:var(--item-color)]"
                        style={{ "--item-color": item.color } as React.CSSProperties}>
                        <CardHeader className='flex flex-row gap-2 items-center'>
                          <Key className='size-4' style={{ color: item.color }} />
                          <CardTitle className='truncate text-base'>{item.name}</CardTitle>
                        </CardHeader>

                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar>
                                {item.full_current_holder && <AvatarImage src={item.full_current_holder?.avatarUrl || undefined} alt={item.full_current_holder.name || undefined} />}
                                <AvatarFallback>
                                  <AlertTriangle className="size-5 text-muted-foreground/50" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div>{item.full_current_holder?.name ?? "Nicht vergeben"}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className='flex-row gap-2 justify-end w-full mt-auto py-1 px-2'>

                          <Button
                            variant={"outline"}
                            onClick={(e) => {
                              const path = amICurrentHolder
                                ? `type=handover&key=${encodeURIComponent(item.id)}`
                                : `type=take&key=${encodeURIComponent(item.id)}`;
                              navigate(`/keys?${path}`);
                              e.stopPropagation();
                            }}
                          >
                            {
                              amICurrentHolder ? t('handover_key') : t('take_key')
                            }
                          </Button>
                        </CardFooter>
                      </Card>
                    })
                }
              </div>
            </div>
          </Has>
        </div>
      </main>
    </div>
  );
};
export default withProfiler(HomePageShadcn);
