import { PullToRefresh } from "@/components/PullToRefresh";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDialogs } from "@/contexts/DialogsProvider";
import { Has } from "@/hooks/useGrants";
import { useAttendance, useBringItems, useCancelTrainingMutation, useComments, useDeleteTrainingMutation, useEvent, useEventMatches, useUpdateAttendanceMutation } from "@/tanstack/events";
import { answerDeadlineExpired, eventHasStarted, eventInThePast, EventsUserView, maxAttendeesExceeded } from '@/types/supabaseTypes';
import { formatSafeDateFromDatabase } from "@/utils";
import { captureException } from "@sentry/react";
import { format, isBefore } from 'date-fns';
import { t } from "i18next";
import {
  Ban,
  Calendar,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  EllipsisVertical,
  Hourglass,
  InfoIcon,
  MapPin,
  Megaphone,
  Pencil,
  ShoppingBag,
  SquareArrowRightExit,
  Trash2,
  Volleyball,
  XCircle
} from "lucide-react";
import { TFunction } from 'node_modules/i18next/typescript/t';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useGrants } from "../../auth/GrantsContext";
import { ConstellationCreationDialog } from "../dialogs/ConstellationsCreationDialog";
import { CreateOrUpdateEventDialog } from "../dialogs/CreateOrUpdateEventDialog";
import { DeleteEventDialog } from "../dialogs/DeleteEventDialog";
import { EditEventOptionsDialog } from "../dialogs/EditEventOptionsDialog";
import { PlaceType } from '../types';
import AttendanceTab from "./tabs/AttendanceTab";
import BringItemsTab from "./tabs/BringItemsTab";
import CommentsTab from "./tabs/CommentsTab";
import EventDetailsTab, { EventWeatherData } from "./tabs/EventDetailsTab";
import MatchesTab from "./tabs/MatchesTab";

type EventInformationProps = {
  event: EventsUserView;
  selectedEventPlace: PlaceType | null;
  keyHolders: FullItemHolder[];
  t: TFunction;
};

const EventInformationAttendanceState = ({ event }: Pick<EventInformationProps, 'event'>) => {
  const { user } = useGrants();
  const { t } = useTranslation();
  const updateAttendance = useUpdateAttendanceMutation();
  const { data: attendance = [], isLoading } = useAttendance(event.id);

  const changeAttendance = ({
    user,
    event,
    newState,
  }: {
    user: User;
    event: EventsUserView;
    newState: EventAttendance;
  }) => {
    updateAttendance.mutate(
      { user, event, newState },
      {
        onError: () => {
          toast.error('An/Abweseneheit konnte nicht aktualisiert werden.');
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-y-4">
      <p className="font-medium">Deine Teilnahme</p>
      {event.user_state === 'Waiting' && (
        <Alert variant={"info"}>
          <InfoIcon />
          <AlertTitle>Warteliste</AlertTitle>
          <AlertDescription>
            {t('events.information.waitingListAccepted', {
              place:
                attendance
                  .filter((x) => x.state === 'Waiting')
                  .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1))
                  .findIndex((x) => x.user.id === user.id) + 1,
              waitingListLength: attendance.filter((x) => x.state === 'Waiting').length,
            })}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" onClick={() => changeAttendance({ user, event, newState: 'Declined' })}>
              {(updateAttendance.isPending || isLoading) ? <Spinner /> : <SquareArrowRightExit />}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {event.user_state === 'WaitingAsTrial' && (
        <Alert variant={"info"}>
          <InfoIcon />
          <AlertTitle>Warteliste</AlertTitle>
          <AlertDescription>
            {t('events.information.waitingListAccepted', {
              place:
                attendance
                  .filter((x) => x.state === 'WaitingAsTrial')
                  .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1))
                  .findIndex((x) => x.user.id === user.id) + 1,
              waitingListLength: attendance.filter((x) => x.state === 'WaitingAsTrial').length,
            })}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" onClick={() => changeAttendance({ user, event, newState: 'Declined' })}>
              {(updateAttendance.isPending || isLoading) ? <Spinner /> : <SquareArrowRightExit />}
            </Button>
          </AlertAction>
        </Alert>
      )}
      <Has perm={'event.signup'}>
        <div className="flex gap-2">
          {maxAttendeesExceeded(event, attendance) && !answerDeadlineExpired(event) && !eventInThePast(event)
            ? <Button
              onClick={() => changeAttendance({ event: event, newState: 'Waiting', user })}
              variant={event.user_state === 'Waiting' ? 'info' : 'outline'}
              className="flex-1"
              disabled={event.isCancelled || event.user_state === 'Waiting' || eventInThePast(event) || eventHasStarted(event)}
            >
              {(updateAttendance.isPending || isLoading) ? <Spinner /> : <Hourglass className="size-4 mr-1" />}
              Warteliste
            </Button>
            : answerDeadlineExpired(event) && !eventInThePast(event)
              ? <Button
                onClick={() => changeAttendance({ event: event, newState: 'RequestedAttendance', user })}
                variant={event.user_state === 'RequestedAttendance' ? 'info' : 'outline'}
                className="flex-1"
                disabled={event.isCancelled || eventInThePast(event) || eventHasStarted(event)}
              >
                {(updateAttendance.isPending || isLoading) ? <Spinner /> : <CheckCircle2 className="size-4 mr-1" />}
                Teilnahme anfragen
              </Button>
              : <Button
                onClick={() => changeAttendance({ event: event, newState: 'Attending', user })}
                variant={event.user_state === 'Attending' ? 'success' : 'outline'}
                className="flex-1"
                disabled={event.isCancelled || maxAttendeesExceeded(event, attendance) || answerDeadlineExpired(event) || eventInThePast(event) || eventHasStarted(event)}
              >
                {(updateAttendance.isPending || isLoading) ? <Spinner /> : <CheckCircle2 className="size-4 mr-1" />}
                Teilnehmen
              </Button>
          }
          <Button
            onClick={() => changeAttendance({ event: event, newState: 'Declined', user })}
            variant={event.user_state === 'Declined' ? 'error' : 'outline'}
            className="flex-1"
            disabled={event.isCancelled || eventInThePast(event) || eventHasStarted(event)}
          >
            {(updateAttendance.isPending || isLoading) ? <Spinner /> : <XCircle className="size-4 mr-1" />}
            Absagen
          </Button>
        </div>
      </Has>
      <Has perm={'event.signup.trainer'}>
        <div className="flex gap-2">
          <Button
            onClick={() => changeAttendance({ event: event, newState: 'AttendingAsTrainer', user })}
            variant={event.user_state === 'AttendingAsTrainer' ? 'success' : 'outline'}
            className="flex-1"
            disabled={event.isCancelled || eventInThePast(event) || eventHasStarted(event)}
          >
            {(updateAttendance.isPending || isLoading) ? <Spinner /> : <Megaphone className="size-4 mr-1" />}
            Als Trainer teilnehmen
          </Button>
        </div>
      </Has>
    </div>
  );
};

export const EventInformation = ({ event, selectedEventPlace }: EventInformationProps) => {
  const updateAttendance = useUpdateAttendanceMutation();
  const cancelTrainingMutation = useCancelTrainingMutation();
  const deleteTrainingMutation = useDeleteTrainingMutation();
  const { user } = useGrants();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data: comments = [], refetch: refetchComments } = useComments(event.id);
  const { data: attendance = [], isLoading, refetch: refetchAttendance } = useAttendance(event.id);
  const { data: matches = [] } = useEventMatches(event.id);
  const { data: allItems = [], isLoading: bringItemsLoading } = useBringItems(event?.id);

  const { refetch: refetchEvent } = useEvent(event.id);

  const refetch = () => {
    refetchEvent();
    refetchComments();
    refetchAttendance();
  };

  const changeAttendance = ({
    user,
    event,
    newState,
  }: {
    user: User;
    event: EventsUserView;
    newState: EventAttendance;
  }) => {
    updateAttendance.mutate(
      { user, event, newState },
      {
        onError: () => {
          toast.error('An/Abweseneheit konnte nicht aktualisiert werden.');
        },
      }
    );
  };

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={"Eventdetails"}
        primaryAction="back"
        navigateBackPath="/training"
        user={user}
        actions={
          <Has perm={['event.delete', 'event.edit', 'event.transform', 'event.cancel']} any>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size={"icon-lg"}>
                <EllipsisVertical />
              </Button>} />
              <DropdownMenuContent className={"w-full"}>
                <Has perm={'event.edit'}>
                  <DropdownMenuItem className={"text-base"} onClick={async () => {
                    const result = await dialogs.open(EditEventOptionsDialog);
                    if (result) {
                      await dialogs.open(CreateOrUpdateEventDialog, {
                        event: {
                          ...event,
                          items_enabled: false,
                          group: event.group?.id ?? null,
                          reminder_before: null,
                          reminder_sent_at: null,
                        } as EventTable,
                        eventGroup: event.group,
                        option: result,
                        items: allItems,
                      });
                    }
                  }}>
                    <Pencil />
                    {t('events.editEvent')}
                  </DropdownMenuItem>
                </Has>

                <Has perm={'event.transform'}>
                  <DropdownMenuItem disabled className={"text-base"}>
                    <Pencil />
                    {t('events.transformEventSeries')}
                  </DropdownMenuItem>
                </Has>

                <Has perm={'event.cancel'}>
                  <DropdownMenuItem className={"text-base"} onClick={async () => {
                    const result = await dialogs.confirm(`Training ${event.isCancelled ? "stattfinden lassen?" : "absagen?"}`, {
                      title: `Training ${event.isCancelled ? "stattfinden lassen?" : "absagen?"}`,
                      message: `Möchtest du das Training wirklich ${event.isCancelled ? "stattfinden lassen?" : "absagen?"}`
                    });
                    if (result)
                      cancelTrainingMutation.mutate(
                        { event, isCancelled: !event.isCancelled },
                        {
                          onError: (error) => {
                            captureException(error);
                            toast.error(error.message);
                          },
                        }
                      );
                  }}>
                    {event.isCancelled ? <CircleCheck /> : <Ban />}
                    {event.isCancelled ? 'Stattfinden' : 'Absagen'}
                  </DropdownMenuItem>
                </Has>

                <Has perm={'event.delete'}>
                  <DropdownMenuItem className={"text-base"} onClick={async () => {
                    const result = await dialogs.open(DeleteEventDialog);
                    if (result)
                      deleteTrainingMutation.mutate(
                        { event, type: result, currentUser: user },
                        {
                          onSuccess: () => {
                            navigate('/training/list', { replace: true });
                          },
                          onError: (error) => {
                            captureException(error);
                            toast.error(error.message);
                          },
                        }
                      );
                  }}>
                    <Trash2 />
                    Löschen
                  </DropdownMenuItem>
                </Has>
              </DropdownMenuContent>
            </DropdownMenu>
          </Has>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="mx-auto max-w-2xl w-full p-4 space-y-4">
            <Card className="border-t-4 border-t-[color:var(--group-color)]"
              style={{ "--group-color": event.group?.color ?? 'primary' } as React.CSSProperties}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <Badge variant="outline" className="mb-2 w-fit font-medium border-[color:var(--group-color)] bg-[color:var(--group-color)]/5 text-[color:var(--group-color)]">
                      {event.group?.name || "Allgemein"}
                    </Badge>
                    <CardTitle className="text-xl sm:text-2xl font-semibold leading-tight">
                      {event.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 max-[375px]:grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium truncate">{format(event.startingDateTime, "dd.MM.yyyy HH:mm")}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">bis {format(event.endDateTime, "dd.MM.yyyy HH:mm")}</p>
                    </div>
                  </div>

                  {selectedEventPlace && (
                    <EventWeatherData place={selectedEventPlace} date={formatSafeDateFromDatabase(event?.startingDateTime)} />
                  )}

                  {event.place && (
                    <div className="flex items-start gap-3 text-sm text-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium truncate">{selectedEventPlace?.name || event.place}</p>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.place)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline mt-0.5 inline-block"
                        >
                          Route planen
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {event.isCancelled && (
                  <Alert variant={"error"}>
                    <InfoIcon />
                    <AlertTitle>Dieses Event wurde <strong>abgesagt</strong></AlertTitle>
                  </Alert>
                )}
                {answerDeadlineExpired(event) && event.answerDeadline && !event.isCancelled && (
                  <Alert variant={"info"}>
                    <InfoIcon />
                    <AlertTitle>{t('events.information.answerDeadlineExceeded', {
                      answerDeadline: new Date(event.answerDeadline ?? new Date()),
                    })}</AlertTitle>
                  </Alert>
                )}
                <EventInformationAttendanceState event={event} />

                {event.constellations_enabled && (
                  <Has perm={"event.create.constellations"}>
                    <Button className={"w-full"} onClick={async () => {
                      dialogs.open(ConstellationCreationDialog, {
                        users: attendance.filter(x => x.state === "Attending").map(x => x.user),
                        event
                      });
                    }}>
                      <Volleyball />
                      Konstellationen erstellen
                    </Button>
                  </Has>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue={"information"} className="w-full mt-6">
              <TabsList className="flex w-full justify-start overscroll-y-none overflow-x-auto bg-white border !h-12 shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsTrigger
                  value="information"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  Information
                </TabsTrigger>

                <TabsTrigger
                  value="attendance"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  Teilnehmer ({attendance.filter(x => ["Attending", "AttendingAsTrainer"].includes(x.state)).length})
                </TabsTrigger>

                <TabsTrigger
                  value="comments"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  Kommentare ({comments.reduce((a, c) => a + c.replies.length + 1, 0)})
                </TabsTrigger>

                <Has feat={"games"}>
                  <TabsTrigger
                    value="matches"
                    className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                  >
                    Spiele ({matches.length})
                  </TabsTrigger>
                </Has>

                {allItems.length > 0 && (
                  <TabsTrigger
                    value="bring-items"
                    className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5 gap-1.5"
                  >
                    <ShoppingBag className="size-4" />
                    Mitbringen
                  </TabsTrigger>
                )}
              </TabsList>
              <div className="pt-4">
                <EventDetailsTab event={event} selectedEventPlace={selectedEventPlace} />
                <AttendanceTab event={event} attendance={attendance} changeAttendance={changeAttendance} />
                <CommentsTab event={event} user={user} comments={comments} />
                <MatchesTab matches={matches} event={event} />
                {allItems.length > 0 && <BringItemsTab eventId={event.id} />}
              </div>
            </Tabs>

            <Has perm={'supabase.admin'}>
              <Card className="pt-0">
                <CardHeader className="border-b !py-2">
                  <div className="flex justify-between items-center !p-0">
                    <CardTitle className="text-lg flex items-center">
                      Admin-Informationen
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-foreground/90">
                  <div>
                    <h4 className="font-semibold text-foreground">Key</h4>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {event.key}
                    </p>
                  </div>

                  <Separator />
                </CardContent>
              </Card>
            </Has>
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export const EventInformationSkeleton = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overscroll-none min-h-0">
      <div className="shrink-0 bg-background relative z-10">
        <AppBar
          className='!border-b !shadow-sm'
          title={""}
          primaryAction="back"
          user={null as any}
        />
      </div>

      <main className='flex-1 relative flex flex-col min-h-0 overflow-hidden'>
        <div className="flex-1 overflow-y-auto overscroll-none w-full relative min-h-0">
          <div className="mx-auto max-w-2xl w-full p-4 space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">

            <Card className="border-t-4 border-t-muted">
              <CardHeader className="pb-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-7 w-3/4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-y-4 pt-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-md" />
                    <Skeleton className="h-10 flex-1 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="w-full mt-6 space-y-4">
              <div className="flex w-full gap-2 h-12 p-1 bg-muted/50 rounded-md">
                <Skeleton className="h-full w-1/3 rounded-sm" />
                <Skeleton className="h-full w-1/3 rounded-sm" />
                <Skeleton className="h-full w-1/3 rounded-sm" />
              </div>

              <Card className="pt-0">
                <CardHeader className="border-b !py-4">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>

                  <Skeleton className="h-[1px] w-full my-4" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>

                  <Skeleton className="h-[1px] w-full my-4" />

                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export const EventInformationError = () => {
  const { user } = useGrants();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overscroll-none min-h-0">
      <div className="shrink-0 bg-background relative z-10">
        <AppBar
          className='!border-b !shadow-sm'
          title={"Fehler"}
          primaryAction="back"
          user={user}
        />
      </div>

      <main className='flex-1 relative flex flex-col min-h-0 overflow-hidden'>
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <EmptyTitle>Event nicht geladen</EmptyTitle>
            <EmptyDescription>
              Das Event konnte leider nicht geladen werden. Möglicherweise wurde es gelöscht, du bist offline oder du hast keine Berechtigung, es zu sehen.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => navigate("events")}>
              Zurück zur Übersicht
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
};

export default EventInformation;
