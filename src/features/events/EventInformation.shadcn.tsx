import { PullToRefresh } from "@/components/pull-to-refresh/PullToRefresh";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Has } from "@/hooks/useGrants";
import { useAddCommentMutation, useAttendance, useComments, useEvent, useUpdateAttendanceMutation } from "@/tanstack/events";
import { answerDeadlineExpired, eventInThePast, EventsUserView, FullAttendance, FullComment, maxAttendeesExceeded } from '@/types/supabaseTypes';
import { formatSafeDateFromDatabase, getInitials } from "@/utils";
import { Separator } from '@base-ui/react/separator';
import { add, closestTo, differenceInCalendarDays, format, isAfter, isBefore } from 'date-fns';
import { t } from "i18next";
import { toNumber } from "lodash";
import {
  Activity, Calendar, Check, CheckCircle2, Clock,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Hourglass, InfoIcon,
  LucideIcon,
  MapPin, Megaphone, MessageSquare,
  Moon,
  SquareArrowRightExit,
  Sun,
  XCircle
} from "lucide-react";
import { TFunction } from 'node_modules/i18next/typescript/t';
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { toast } from "sonner";
import { useGrants } from "../auth/GrantsContext";
import { PlaceType } from './types';

const iconMap: Record<string, LucideIcon> = {
  "01d": Sun,
  "01n": Moon,
  "02d": CloudSun,
  "02n": CloudMoon,
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloud,
  "04n": Cloud,
  "09d": CloudRain,
  "09n": CloudRain,
  "10d": CloudRain,
  "10n": CloudRain,
  "11d": CloudLightning,
  "11n": CloudLightning,
  "13d": CloudSnow,
  "13n": CloudSnow,
  "50d": CloudFog,
  "50n": CloudFog,
};

type EventInformationProps = {
  event: EventsUserView;
  selectedEventPlace: PlaceType | null;
  keyHolders: FullItemHolder[];
  t: TFunction;
  fetchMode: 'past' | 'upcoming';
};

const EventInformationAttendanceState = ({ event, fetchMode }: Pick<EventInformationProps, 'event' | 'fetchMode'>) => {

  const { user } = useGrants();
  const { t } = useTranslation();
  const updateAttendance = useUpdateAttendanceMutation(fetchMode);
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
  }

  return <div className="flex flex-col gap-y-4">
    <p className="font-medium">Deine Teilnahme</p>
    {
      event.user_state === 'Waiting' && (
        <Alert variant={"info"}>
          <InfoIcon />
          <AlertTitle>Warteliste</AlertTitle>
          <AlertDescription>
            {
              t('events.information.waitingListAccepted', {
                place:
                  attendance
                    .filter((x) => x.state === 'Waiting')
                    .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1))
                    .findIndex((x) => x.user.id === user.id) + 1,
                waitingListLength: attendance.filter((x) => x.state === 'Waiting').length,
              })
            }
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" onClick={() => changeAttendance({ user, event, newState: 'Declined' })}>
              <SquareArrowRightExit />
            </Button>
          </AlertAction>
        </Alert>
      )}
    {
      event.user_state === 'WaitingAsTrial' && (
        <Alert variant={"info"}>
          <InfoIcon />
          <AlertTitle>Warteliste</AlertTitle>
          <AlertDescription>
            {
              t('events.information.waitingListAccepted', {
                place:
                  attendance
                    .filter((x) => x.state === 'WaitingAsTrial')
                    .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1))
                    .findIndex((x) => x.user.id === user.id) + 1,
                waitingListLength: attendance.filter((x) => x.state === 'WaitingAsTrial').length,
              })
            }
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" onClick={() => changeAttendance({ user, event, newState: 'Declined' })}>
              <SquareArrowRightExit />
            </Button>
          </AlertAction>
        </Alert>
      )}
    <Has perm={'event.signup'}>
      <div className="flex gap-2">
        {
          maxAttendeesExceeded(event, attendance) && !answerDeadlineExpired(event) &&
            !eventInThePast(event)
            ? <Button
              onClick={() => changeAttendance({ event: event, newState: 'Waiting', user })}
              variant={event.user_state === 'Waiting' ? 'info' : 'outline'}
              className="flex-1"
              disabled={event.isCancelled ||
                event.user_state === 'Waiting' ||
                eventInThePast(event)}
            >
              <Hourglass className="size-4 mr-1" />
              Warteliste
            </Button>

            : answerDeadlineExpired(event) && !eventInThePast(event)
              ? <Button
                onClick={() => changeAttendance({ event: event, newState: 'RequestedAttendance', user })}
                variant={event.user_state === 'RequestedAttendance' ? 'info' : 'outline'}
                className="flex-1"
                disabled={event.isCancelled ||
                  eventInThePast(event)}
              >
                <CheckCircle2 className="size-4 mr-1" />
                Teilnahme anfragen
              </Button>
              : <Button
                onClick={() => changeAttendance({ event: event, newState: 'Attending', user })}
                variant={event.user_state === 'Attending' ? 'success' : 'outline'}
                className="flex-1"
                disabled={event.isCancelled
                  || maxAttendeesExceeded(event, attendance) ||
                  answerDeadlineExpired(event) ||
                  eventInThePast(event)}
              >
                <CheckCircle2 className="size-4 mr-1" />
                Teilnehmen
              </Button>
        }
        <Button
          onClick={() => changeAttendance({ event: event, newState: 'Declined', user })}
          variant={event.user_state === 'Declined' ? 'error' : 'outline'}
          className="flex-1"
        >
          <XCircle className="size-4 mr-1" />
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
        >
          <Megaphone className="size-4 mr-1" />
          Als Trainer teilnehmen
        </Button>
      </div>
    </Has>
  </div>
}

const EventInformationTab = ({ event, selectedEventPlace }: { event: EventsUserView; selectedEventPlace: PlaceType | null }) => {
  return <TabsContent value="information" className="space-y-4 m-0">
    <Card className="pt-0">
      <CardHeader className="border-b !py-2">
        <div className="flex justify-between items-center !p-0">
          <CardTitle className="text-lg flex items-center">
            Information
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-4 text-foreground/90">
        <div>
          <h4 className="font-semibold mb-1 text-foreground">Beschreibung</h4>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
            {event.description || "Keine Beschreibung angegeben."}
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {event.meetingDateTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <span className="text-muted-foreground text-xs block">Treffpunkt</span>
                <span className="font-medium">{format(event.meetingDateTime, "dd.MM.yyyy HH:mm")}</span>
              </div>
            </div>
          )}

          {event.recurrence !== "None" && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <span className="text-muted-foreground text-xs block">Wiederholung</span>
                <span className="font-medium">{event.recurrence}</span>
              </div>
            </div>
          )}
        </div>

        {
          selectedEventPlace && <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Standort</h4>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(JSON.stringify(selectedEventPlace))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative h-48 w-full overflow-hidden rounded-lg border bg-muted group cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10 flex items-center justify-center">
                  <div className="bg-background/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-full text-sm font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 duration-200">
                    <MapPin className="h-4 w-4 text-primary" />
                    Route hierher planen
                  </div>
                </div>
                <MapContainer
                  style={{ width: '100%', height: '100%', borderRadius: '16px' }}
                  center={[selectedEventPlace.lat, selectedEventPlace.lon]}
                  zoom={15}
                  dragging={false}
                  doubleClickZoom={false}
                  scrollWheelZoom={false}
                  attributionControl={false}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedEventPlace.lat, selectedEventPlace.lon]} interactive={false} />
                </MapContainer>
              </a>
            </div>
          </>
        }
      </CardContent>
    </Card>
  </TabsContent>
}

const EventAttendanceTab = ({ event, attendance, changeAttendance }: { event: EventsUserView; attendance: FullAttendance[]; changeAttendance: ({ user, event, newState }: { user: User; event: EventsUserView; newState: EventAttendance }) => void }) => {

  const attending = useMemo(
    () => attendance.filter((x) => x.state === 'Attending' || x.state === 'AttendingAsTrainer' || x.state === 'AttendingAsTrial').sort((a, b) => isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1),
    [attendance]
  );
  const declined = useMemo(() => attendance.filter((x) => x.state === 'Declined'), [attendance]);
  const requested = useMemo(() => attendance.filter((x) => x.state === 'RequestedAttendance'), [attendance]);
  const waiting = useMemo(() => attendance.filter((x) => x.state === 'Waiting' || x.state === 'WaitingAsTrial'), [attendance]);

  return <TabsContent value="attendance" className="m-0">
    <Card className="pt-0">
      <CardHeader className="border-b !py-2">
        <div className="flex justify-between items-center !p-0">
          <CardTitle className="text-lg flex items-center">
            Teilnehmerliste
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Attending Group */}
        <div className="px-4 pb-4 border-b last:border-0">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between">
            <span>Zusagen ({attending.length})</span>
          </h4>
          {attending.length > 0 ? (
            <div className="space-y-3">
              {attending.map((attendance) => (
                <div key={attendance.user.id} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={attendance.user.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? "User")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attendance.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {attendance.state === "AttendingAsTrainer" && "Trainer"}
                      {attendance.state === "AttendingAsTrial" && "Probetraining"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Noch keine Zusagen.</p>
          )}
        </div>
        {/* Requested Group */}
        {requested.length > 0 && (
          <div className="p-4 border-b last:border-0 bg-secondary/5">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between">
              <span>Anfragen ({requested.length})</span>
            </h4>
            <div className="space-y-3">
              {requested.map((attendance) => (
                <div key={attendance.user.id} className="flex items-center gap-3 opacity-80">
                  <Avatar>
                    <AvatarImage
                      src={attendance.user.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? "User")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attendance.user?.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-[12px] h-6">Wartend</Badge>
                  <Has perm={"event.manage.attendees"}>
                    <Button variant="outline" size="icon" className="ml-1" onClick={() => changeAttendance({ user: attendance.user, event, newState: 'Attending' })}>
                      <Check className="size-4" />
                    </Button>
                  </Has>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Group */}
        {waiting.length > 0 && (
          <div className="p-4 border-b last:border-0 bg-secondary/5">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between">
              <span>Warteliste ({waiting.length})</span>
            </h4>
            <div className="space-y-3">
              {waiting.map((attendance) => (
                <div key={attendance.user.id} className="flex items-center gap-3 opacity-80">
                  <Avatar>
                    <AvatarImage
                      src={attendance.user.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? "User")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attendance.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {attendance.state === "WaitingAsTrial" && "Probetraining"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[12px] h-6">Wartend</Badge>
                  <Has perm={"event.manage.attendees"}>
                    <Button variant="outline" size="icon" className="ml-1" onClick={() => changeAttendance({ user: attendance.user, event, newState: 'Attending' })}>
                      <Check className="size-4" />
                    </Button>
                  </Has>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined Group */}
        {declined.length > 0 && (
          <div className="p-4 pb-0 border-b last:border-0">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between">
              <span>Absagen ({declined.length})</span>
            </h4>
            <div className="space-y-3">
              {declined.map((attendance) => (
                <div key={attendance.user.id} className="flex items-center gap-3 opacity-80">
                  <Avatar>
                    <AvatarImage
                      src={attendance.user.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? "User")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attendance.user?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </TabsContent>
}

const EventCommentsTab = ({ event, user, comments }: { event: EventsUserView; user: User; comments: FullComment[] }) => {

  const addCommentMutation = useAddCommentMutation(user);
  const { hasPerm } = useGrants();

  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);

    const commentValue = data.get('comment')?.toString();
    if (!commentValue) return;

    addCommentMutation.mutate(
      { event, comment: commentValue, reply_to: null },
      {
        onError: (error, vars) => {
          toast.error('Kommentar konnte nicht hinzugefügt werden.');
        },
      }
    );
    formEvent.currentTarget.reset();
  };

  return <TabsContent value="comments" className="m-0">
    <Card className="pt-0 gap-0">
      <CardHeader className="border-b !py-2">
        <div className="flex justify-between items-center !p-0">
          <CardTitle className="text-lg flex items-center">
            Kommentare
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="flex flex-row items-center gap-3 border-b last:border-0 pb-2">
              <Avatar>
                <AvatarImage
                  src={comment.user.avatarUrl || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(comment.user.name ?? "User")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{comment.displayName}</p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "dd.MM HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 ">{comment.comment}</p>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-3 pl-4 border-l-2">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar>
                          <AvatarImage
                            src={reply.user.avatarUrl || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(reply.user.name ?? "User")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">{reply.displayName}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(reply.created_at), "HH:mm")}
                            </span>
                          </div>
                          <div className="text-xs text-foreground/90 mt-0.5">
                            {reply.comment}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-20" />
            <p>Noch keine Kommentare.<br />Sei der Erste!</p>
          </div>
        )}
      </CardContent>

      {/* Comment Input */}
      <form onSubmit={submit}>
        <div className="p-3 pb-0 border-t bg-background shrink-0 flex items-center gap-2">
          <Avatar>
            <AvatarImage
              src={user.avatarUrl || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name ?? "User")}</AvatarFallback>
          </Avatar>
          <textarea
            id="comment"
            name="comment"
            placeholder="Kommentar schreiben..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={1}
          />
          <Button
            type="submit"
            className="shrink-0"
            disabled={eventInThePast(event) || !hasPerm('event.comment')}>Senden</Button>
        </div>
      </form>
    </Card>
  </TabsContent>
}

type WeatherData = {
  icon: string;
  temperature: string;
  wind_speed: string;
  description: string;
};


const EventWeatherData = ({ place, date }: { place: PlaceType; date: Date | null }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);


  const transformOWIconToIcon = (icon: string) => {
    return iconMap[icon] || 'question';
  }

  useEffect(() => {
    if (!import.meta.env.VITE_OPENWEATHER_API_KEY || !date) return;

    if (isAfter(date, add(new Date(), { days: 5 }))) return;

    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${place.lat}&lon=${place.lon}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric&lang=de`
    )
      .then((res) => res.json())
      .then(async (json) => {
        const dates = json?.list?.map((item: any) => new Date(item.dt * 1000)) ?? [];

        const closestDate = closestTo(date, dates);

        const result =
          json?.list?.find(
            (item: any) =>
              new Date(item.dt * 1000).getTime() === closestDate?.getTime() &&
              Math.abs(differenceInCalendarDays(closestDate, date)) <= 1
          ) ?? null;

        if (result) {

          setWeatherData({
            icon: result.weather[0].icon,
            temperature: toNumber(result.main.temp).toFixed(0),
            wind_speed: toNumber(result.wind.speed).toFixed(0),
            description: result.weather[0].description,
          });
        }
      });
  }, [place, date]);

  if (!weatherData) return null;

  return <div className="flex items-start gap-3 text-sm text-foreground">
    {
      iconMap[weatherData.icon] && (() => {
        const IconComponent = iconMap[weatherData.icon];
        return <IconComponent className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      })()
    }
    <div>
      <p className="font-medium">{`${weatherData.temperature}°C · ${weatherData.wind_speed}km/h`}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{weatherData.description}</p>
    </div>
  </div>
}

const EventInformationShadcn = ({ event, selectedEventPlace, fetchMode }: EventInformationProps) => {
  const updateAttendance = useUpdateAttendanceMutation(fetchMode);
  const { user } = useGrants();
  const { data: comments = [], refetch: refetchComments } = useComments(event.id);
  const { data: attendance = [], isLoading, refetch: refetchAttendance } = useAttendance(event.id);

  const { refetch: refetchEvent } = useEvent(event.id);

  const refetch = () => {
    refetchEvent();
    refetchComments();
    refetchAttendance();
  }

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
  }

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={"Eventdetails"}
      primaryAction="back"
      user={user}
    />
    <main className='flex-1 size-full'>
      <PullToRefresh onRefresh={() => refetch()}>
        <div className="mx-auto max-w-2xl w-full p-4 space-y-4">
          <Card className="border-t-4 border-t-[color:var(--group-color)]"
            style={{ "--group-color": event.group?.color ?? '#000000' } as React.CSSProperties}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <Badge variant="outline" className="mb-2 w-fit font-medium border-[color:var(--group-color)] bg-[color:var(--group-color)]/5 text-[color:var(--group-color)]">
                    {event.group?.name || "Allgemein"}
                  </Badge>
                  <CardTitle className="text-xl sm:text-2xl font-semibold leading-tight">
                    {event.title}
                  </CardTitle>
                  {event.isCancelled && (
                    <Badge variant="destructive" className="mt-2 text-sm uppercase font-bold tracking-wider">
                      Fällt aus
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{format(event.startingDateTime, "dd.MM.yyyy HH:mm")}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">bis {format(event.endDateTime, "dd.MM.yyyy HH:mm")}</p>
                  </div>
                </div>

                {
                  selectedEventPlace && (
                    <EventWeatherData place={selectedEventPlace} date={formatSafeDateFromDatabase(event?.startingDateTime)} />
                  )
                }

                {event.place && (
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedEventPlace?.name || event.place}</p>
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

              {
                event.isCancelled && (
                  <Alert variant={"error"}>
                    <InfoIcon />
                    <AlertTitle>Dieses Event wurde <strong>abgesagt</strong></AlertTitle>
                  </Alert>
                )
              }
              {answerDeadlineExpired(event) && event.answerDeadline && !event.isCancelled && (
                <Alert variant={"info"}>
                  <InfoIcon />
                  <AlertTitle>{t('events.information.answerDeadlineExceeded', {
                    answerDeadline: new Date(event.answerDeadline ?? new Date()),
                  })}</AlertTitle>
                </Alert>
              )}
              <EventInformationAttendanceState event={event} fetchMode={fetchMode} />
            </CardContent>
          </Card>

          <Tabs defaultValue={"information"} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border !h-12 shadow-sm">
              <TabsTrigger value="information" className="h-10 data-[state=active]:bg-primary/5">Information</TabsTrigger>
              <TabsTrigger value="attendance" className="h-10 data-[state=active]:bg-primary/5">Teilnehmer ({attendance.filter(x => ["Attending", "AttendingAsTrainer"].includes(x.state)).length})</TabsTrigger>
              <TabsTrigger value="comments" className="h-10 data-[state=active]:bg-primary/5">Kommentare ({comments.length})</TabsTrigger>
            </TabsList>
            <div className="pt-4">
              <EventInformationTab event={event} selectedEventPlace={selectedEventPlace} />
              <EventAttendanceTab event={event} attendance={attendance} changeAttendance={changeAttendance} />
              <EventCommentsTab event={event} user={user} comments={comments} />
            </div>
          </Tabs>
        </div>
      </PullToRefresh>
    </main>
  </div >
};

import { Skeleton } from "@/components/ui/skeleton";

export const EventInformationSkeleton = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overscroll-none min-h-0">
      {/* AppBar Skeleton */}
      <div
        className="shrink-0 bg-background relative z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <AppBar
          className='!border-b !shadow-sm'
          title={""}
          primaryAction="back"
          user={null as any} // oder ein Mock-User Objekt
        />
      </div>

      <main className='flex-1 relative flex flex-col min-h-0 overflow-hidden'>
        <div className="flex-1 overflow-y-auto overscroll-none w-full relative min-h-0">
          <div className="mx-auto max-w-2xl w-full p-4 space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">

            {/* Top Card Skeleton */}
            <Card className="border-t-4 border-t-muted">
              <CardHeader className="pb-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24 rounded-full" /> {/* Badge */}
                  <Skeleton className="h-7 w-3/4" /> {/* Title */}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                  {/* Date / Time */}
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>

                  {/* Weather */}
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>

                {/* Attendance Buttons Skeleton */}
                <div className="flex flex-col gap-y-4 pt-2">
                  <Skeleton className="h-4 w-32" /> {/* "Deine Teilnahme" Text */}
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-md" /> {/* Teilnehmen Button */}
                    <Skeleton className="h-10 flex-1 rounded-md" /> {/* Absagen Button */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Skeleton */}
            <div className="w-full mt-6 space-y-4">
              <div className="flex w-full gap-2 h-12 p-1 bg-muted/50 rounded-md">
                <Skeleton className="h-full w-1/3 rounded-sm" />
                <Skeleton className="h-full w-1/3 rounded-sm" />
                <Skeleton className="h-full w-1/3 rounded-sm" />
              </div>

              {/* Tab Content Skeleton (Information Tab) */}
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

                  <Skeleton className="h-[1px] w-full my-4" /> {/* Separator */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>

                  <Skeleton className="h-[1px] w-full my-4" /> {/* Separator */}

                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-48 w-full rounded-lg" /> {/* Map Skeleton */}
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

export default EventInformationShadcn;
