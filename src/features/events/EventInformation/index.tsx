import { trialAttendanceError } from '@/features/trials/trialErrors';
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
import { answerDeadlineExpired, answerNotOpenYet, eventHasStarted, eventInThePast, EventsUserView, isMemberOfEventGroup, maxAttendeesExceeded } from '@/types/supabaseTypes';
import { formatSafeDateFromDatabase } from "@/utils";
import { captureException } from "@sentry/react";
import { isBefore, isSameDay } from 'date-fns';
import {
  Ban,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  Clock,
  EllipsisVertical,
  Hourglass,
  InfoIcon,
  MapPin,
  Megaphone,
  Pencil,
  ShoppingBag,
  SquareArrowRightExit,
  Trash2,
  Users,
  Volleyball,
  XCircle
} from "lucide-react";
import { TFunction } from 'node_modules/i18next/typescript/t';
import { Trans, useTranslation } from "react-i18next";
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

const statusOf = (state: EventsUserView['user_state']) => {
  switch (state) {
    case 'Attending':
      return { key: 'statusAttending', variant: 'success' as const };
    case 'AttendingAsTrainer':
      return { key: 'statusTrainer', variant: 'success' as const };
    case 'AttendingAsTrial':
      return { key: 'statusTrial', variant: 'success' as const };
    case 'Declined':
      return { key: 'statusDeclined', variant: 'error' as const };
    case 'Waiting':
    case 'WaitingAsTrial':
      return { key: 'statusWaiting', variant: 'info' as const };
    case 'RequestedAttendance':
      return { key: 'statusRequested', variant: 'info' as const };
    default:
      return { key: 'statusNone', variant: 'outline' as const };
  }
};

const EventInformationAttendanceState = ({ event }: Pick<EventInformationProps, 'event'>) => {
  const { user } = useGrants();
  const { t } = useTranslation();
  const updateAttendance = useUpdateAttendanceMutation();
  const { data: attendance = [] } = useAttendance(event.id);

  const pendingState = updateAttendance.isPending ? updateAttendance.variables?.newState : undefined;
  const busy = updateAttendance.isPending;
  const status = statusOf(event.user_state);
  const isOver = eventInThePast(event);
  const locked = event.isCancelled || isOver || eventHasStarted(event) || answerNotOpenYet(event);

  const changeAttendance = (newState: EventAttendance) => {
    updateAttendance.mutate(
      { user, event, newState },
      {
        onError: (error) => {
          // Trial rules already get their own message from the mutation.
          if (!trialAttendanceError(error)) toast.error(t('events.information.attendanceUpdateError'));
        },
      }
    );
  };

  const waitingState = event.user_state === 'Waiting' || event.user_state === 'WaitingAsTrial' ? event.user_state : null;
  const waitingList = waitingState
    ? attendance
      .filter((x) => x.state === waitingState)
      .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1))
    : [];

  const full = maxAttendeesExceeded(event, attendance);
  const deadlinePassed = answerDeadlineExpired(event);
  // Someone who already attends keeps the attend button; waiting list and request are for everyone else.
  const attendingNow = event.user_state === 'Attending' || event.user_state === 'AttendingAsTrial';

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('events.information.yourAttendance')}</p>
        <Badge variant={status.variant}>{t(`events.information.${status.key}`)}</Badge>
      </div>

      {waitingState && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>{t('events.information.waitingList')}</AlertTitle>
          <AlertDescription>
            {t('events.information.waitingListAccepted', {
              place: waitingList.findIndex((x) => x.user.id === user.id) + 1,
              waitingListLength: waitingList.length,
            })}
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              aria-label={t('events.information.leaveWaitingList')}
              disabled={busy}
              onClick={() => changeAttendance('Declined')}
            >
              {pendingState === 'Declined' ? <Spinner /> : <SquareArrowRightExit />}
            </Button>
          </AlertAction>
        </Alert>
      )}

      {!isOver && (
        <Has perm={'event.signup'}>
          <div className="flex gap-2">
            {full && !deadlinePassed && !attendingNow
              ? <Button
                onClick={() => changeAttendance('Waiting')}
                variant={event.user_state === 'Waiting' ? 'info' : 'outline'}
                className="flex-1"
                disabled={busy || locked || event.user_state === 'Waiting'}
              >
                {pendingState === 'Waiting' ? <Spinner /> : <Hourglass className="size-4" />}
                {t('events.information.waitingList')}
              </Button>
              : deadlinePassed && !attendingNow
                ? <Button
                  onClick={() => changeAttendance('RequestedAttendance')}
                  variant={event.user_state === 'RequestedAttendance' ? 'info' : 'outline'}
                  className="flex-1"
                  disabled={busy || locked}
                >
                  {pendingState === 'RequestedAttendance' ? <Spinner /> : <CheckCircle2 className="size-4" />}
                  {t('events.information.requestAttendance')}
                </Button>
                : <Button
                  onClick={() => changeAttendance('Attending')}
                  variant={attendingNow ? 'success' : 'outline'}
                  className="flex-1"
                  disabled={busy || locked}
                >
                  {pendingState === 'Attending' ? <Spinner /> : <CheckCircle2 className="size-4" />}
                  {t('events.information.attend')}
                </Button>
            }
            <Button
              onClick={() => changeAttendance('Declined')}
              variant={event.user_state === 'Declined' ? 'error' : 'outline'}
              className="flex-1"
              disabled={busy || locked}
            >
              {pendingState === 'Declined' && !waitingState ? <Spinner /> : <XCircle className="size-4" />}
              {t('events.information.decline')}
            </Button>
          </div>
        </Has>
      )}

      {!isOver && (
        <Has perm={'event.signup.trainer'}>
          <Button
            onClick={() => changeAttendance('AttendingAsTrainer')}
            variant={event.user_state === 'AttendingAsTrainer' ? 'success' : 'outline'}
            disabled={busy || locked}
          >
            {pendingState === 'AttendingAsTrainer' ? <Spinner /> : <Megaphone className="size-4" />}
            {t('events.information.attendAsTrainer')}
          </Button>
        </Has>
      )}
    </section>
  );
};

export const EventInformation = ({ event, selectedEventPlace }: EventInformationProps) => {
  const { t, i18n } = useTranslation();
  const updateAttendance = useUpdateAttendanceMutation();
  const cancelTrainingMutation = useCancelTrainingMutation();
  const deleteTrainingMutation = useDeleteTrainingMutation();
  const { user } = useGrants();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data: comments = [], refetch: refetchComments } = useComments(event.id);
  const { data: attendance = [], refetch: refetchAttendance } = useAttendance(event.id);
  const { data: matches = [] } = useEventMatches(event.id);
  const { data: allItems = [] } = useBringItems(event?.id);

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
        onError: (error) => {
          // Trial rules already get their own message from the mutation.
          if (!trialAttendanceError(error)) toast.error(t('events.information.attendanceUpdateError'));
        },
      }
    );
  };

  const lang = i18n.resolvedLanguage;
  const start = new Date(event.startingDateTime);
  const end = event.endDateTime ? new Date(event.endDateTime) : null;
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' });
  const dayFormat = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const dateTimeFormat = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const sameDay = end ? isSameDay(start, end) : true;
  const attendingCount = attendance.filter((x) => x.state === 'Attending').length;
  const isFull = maxAttendeesExceeded(event, attendance);
  // Event of a subgroup the user is no member of: view only (RLS enforces it too).
  const readOnly = !isMemberOfEventGroup(event);

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('events.information.title')}
        primaryAction="back"
        navigateBackPath="/training"
        user={user}
        actions={
          !readOnly && <Has perm={['event.delete', 'event.edit', 'event.transform', 'event.cancel']} any>
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
                        } as unknown as EventTable,
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
                    const result = await dialogs.confirm(event.isCancelled ? t('events.information.reinstateTrainingTitle') : t('events.information.cancelTrainingTitle'), {
                      title: event.isCancelled ? t('events.information.reinstateTrainingTitle') : t('events.information.cancelTrainingTitle'),
                      message: event.isCancelled ? t('events.information.reinstateTrainingMessage') : t('events.information.cancelTrainingMessage')
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
                    {event.isCancelled ? t('events.information.reinstateAction') : t('events.information.cancelAction')}
                  </DropdownMenuItem>
                </Has>

                <Has perm={'event.delete'}>
                  <DropdownMenuItem variant="destructive" className={"text-base"} onClick={async () => {
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
                    {t('common.delete')}
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
              style={{ "--group-color": event.group?.color ?? 'var(--primary)' } as React.CSSProperties}>
              <CardHeader className="pb-0">
                <div className="flex items-start gap-4">
                  <div
                    className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--group-color)]/10 text-[color:var(--group-color)]"
                    aria-hidden="true"
                  >
                    <span className="text-xs font-semibold uppercase">{new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(start)}</span>
                    <span className="text-2xl font-bold leading-none">{start.getDate()}</span>
                    <span className="text-xs uppercase">{new Intl.DateTimeFormat(lang, { month: 'short' }).format(start)}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge variant="outline" className="w-fit font-medium border-[color:var(--group-color)] bg-[color:var(--group-color)]/5 text-[color:var(--group-color)]">
                      {event.group?.name || t('events.information.general')}
                    </Badge>
                    <CardTitle className="text-xl sm:text-2xl font-semibold leading-tight break-words">
                      {event.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {event.isCancelled && <Badge variant="error"><Ban />{t('events.information.cancelledBadge')}</Badge>}
                  {isFull && !event.isCancelled && <Badge variant="warning">{t('events.information.full')}</Badge>}
                  {!!event.maxAttendees && event.maxAttendees > 0 && (
                    <Badge variant="outline"><Users />{t('events.information.capacity', { count: attendingCount, max: event.maxAttendees })}</Badge>
                  )}
                  {event.answerDeadline && !answerDeadlineExpired(event) && !event.isCancelled && (
                    <Badge variant="outline"><Clock />{t('events.information.answerBy', { date: dateTimeFormat.format(new Date(event.answerDeadline)) })}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 max-[375px]:grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{dayFormat.format(start)}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {sameDay
                          ? end ? `${timeFormat.format(start)} – ${timeFormat.format(end)}` : timeFormat.format(start)
                          : `${timeFormat.format(start)} · ${t('events.information.until', { end: dateTimeFormat.format(end!) })}`}
                      </p>
                    </div>
                  </div>

                  {selectedEventPlace && (
                    <EventWeatherData place={selectedEventPlace} date={formatSafeDateFromDatabase(event?.startingDateTime)} />
                  )}

                  {event.place && (
                    <div className="flex items-start gap-3 text-sm text-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{selectedEventPlace?.name || event.place}</p>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.place)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline mt-0.5 inline-block"
                        >
                          {t('events.information.planRoute')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {event.isCancelled && (
                  <Alert variant={"error"}>
                    <InfoIcon />
                    <AlertTitle><Trans i18nKey="events.information.eventCancelled" components={{ strong: <strong /> }} /></AlertTitle>
                  </Alert>
                )}
                {answerNotOpenYet(event) && event.answerStart && !event.isCancelled && (
                  <Alert variant={"info"}>
                    <InfoIcon />
                    <AlertTitle>{t('events.information.answerNotOpenYet', {
                      date: dateTimeFormat.format(new Date(event.answerStart)),
                    })}</AlertTitle>
                  </Alert>
                )}
                {answerDeadlineExpired(event) && event.answerDeadline && !event.isCancelled && (
                  <Alert variant={"info"}>
                    <InfoIcon />
                    <AlertTitle>{t('events.information.answerDeadlineExceeded', {
                      answerDeadline: new Date(event.answerDeadline),
                    })}</AlertTitle>
                  </Alert>
                )}
                {readOnly ? (
                  <Alert variant="info">
                    <InfoIcon />
                    <AlertTitle>{t('events.information.viewOnlyTitle', { group: event.group?.name ?? '' })}</AlertTitle>
                    <AlertDescription>{t('events.information.viewOnlyDescription')}</AlertDescription>
                    {event.group && (
                      <AlertAction>
                        <Button variant="outline" onClick={() => navigate(`/groups/${event.group!.id}`)}>
                          {t('events.information.viewOnlyGroup')}
                        </Button>
                      </AlertAction>
                    )}
                  </Alert>
                ) : (
                  <EventInformationAttendanceState event={event} />
                )}

                {!readOnly && event.constellations_enabled && (
                  <Has perm={"event.create.constellations"}>
                    <Button className={"w-full"} onClick={async () => {
                      dialogs.open(ConstellationCreationDialog, {
                        users: attendance.filter(x => x.state === "Attending").map(x => x.user),
                        event
                      });
                    }}>
                      <Volleyball />
                      {t('events.information.createConstellations')}
                    </Button>
                  </Has>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue={"information"} className="w-full mt-6">
              <TabsList className="flex w-full justify-start overscroll-y-none overflow-x-auto bg-card border !h-12 shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsTrigger
                  value="information"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  {t('events.information.tabInformation')}
                </TabsTrigger>

                <TabsTrigger
                  value="attendance"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  {t('events.information.tabAttendance', { n: attendance.filter(x => ["Attending", "AttendingAsTrainer", "AttendingAsTrial"].includes(x.state)).length })}
                </TabsTrigger>

                <TabsTrigger
                  value="comments"
                  className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                >
                  {t('events.information.tabComments', { n: comments.reduce((a, c) => a + c.replies.length + 1, 0) })}
                </TabsTrigger>

                <Has feat={"games"}>
                  <TabsTrigger
                    value="matches"
                    className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5"
                  >
                    {t('events.information.tabMatches', { n: matches.length })}
                  </TabsTrigger>
                </Has>

                {allItems.length > 0 && (
                  <TabsTrigger
                    value="bring-items"
                    className="flex-1 whitespace-nowrap h-10 px-4 data-[state=active]:bg-primary/5 gap-1.5"
                  >
                    <ShoppingBag className="size-4" />
                    {t('events.bringItems.tab')}
                  </TabsTrigger>
                )}
              </TabsList>
              <div className="pt-4">
                <EventDetailsTab event={event} selectedEventPlace={selectedEventPlace} />
                <AttendanceTab event={event} attendance={attendance} changeAttendance={changeAttendance} readOnly={readOnly} />
                <CommentsTab event={event} user={user} comments={comments} readOnly={readOnly} />
                <MatchesTab matches={matches} event={event} readOnly={readOnly} />
                {allItems.length > 0 && <BringItemsTab eventId={event.id} />}
              </div>
            </Tabs>

            <Has perm={'supabase.admin'}>
              <Card className="pt-0">
                <CardHeader className="border-b !py-2">
                  <div className="flex justify-between items-center !p-0">
                    <CardTitle className="text-lg flex items-center">
                      {t('events.information.adminInformation')}
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
  const { t } = useTranslation();
  const { user } = useGrants();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overscroll-none min-h-0">
      <div className="shrink-0 bg-background relative z-10">
        <AppBar
          className='!border-b !shadow-sm'
          title={t('events.information.errorTitle')}
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
            <EmptyTitle>{t('events.information.notLoaded')}</EmptyTitle>
            <EmptyDescription>
              {t('events.information.notLoadedDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => navigate("/training/list")}>
              {t('events.information.backToOverview')}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
};

export default EventInformation;
