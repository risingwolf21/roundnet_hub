import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import EventInformationLoading from '@/features/events/components/EventInformationLoading';
import { CancelTrainingDialog } from '@/features/events/dialogs/CancelTrainingDialog';
import { CreateOrUpdateEventDialog } from '@/features/events/dialogs/CreateOrUpdateEventDialog';
import { DeleteEventDialog } from '@/features/events/dialogs/DeleteEventDialog';
import { EditEventOptionsDialog } from '@/features/events/dialogs/EditEventOptionsDialog';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import {
  eventKeys,
  useBringItems,
  useCancelTrainingMutation,
  useDeleteTrainingMutation,
  useEvent,
} from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { captureException } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { EventTable } from 'types/supabase';
import EventInformation from './EventInformation';
import { PlaceType } from './types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@base-ui/react/separator';
import Delete from '@mui/icons-material/Delete';
import DoNotDisturb from '@mui/icons-material/DoNotDisturb';
import DoNotDisturbOff from '@mui/icons-material/DoNotDisturbOff';
import Edit from '@mui/icons-material/Edit';
import MoreVert from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { format } from 'date-fns';
import { Calendar, Check, CheckCircle2, Clock, MapPin, X, XCircle } from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { useGrants } from '../auth/GrantsContext';
import { TransformEventDialog } from './dialogs/TransformEventDialog';
import EventAdminInformation from './EventAdminInformation';

const EventInformationProvider = () => {
  const { selectedEventId } = useParams();
  const { user } = useGrants();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLButtonElement) | null>(null);
  const [fetchMode] = useFetchMode();

  const cancelTrainingMutation = useCancelTrainingMutation(fetchMode);
  const deleteTrainingMutation = useDeleteTrainingMutation(fetchMode);
  const { data: event, isLoading, refetch } = useEvent(selectedEventId);
  const { data: allItems = [], isLoading: bringItemsLoading } = useBringItems(event?.id);
  const { data: keyHolders = [], isLoading: keyHoldersLoading } = useAllItems();

  const [searchQuery, setSearchQuery] = useState("");
  const [commentText, setCommentText] = useState("");

  // Beispiel-Funktion für die Sidebar
  const toggleSidebar = () => {
    navigate(-1)
  };

  const selectedEventPlace = useMemo<PlaceType | null>(() => {
    if (event && event.place) {
      try {
        const parsed = JSON.parse(event.place.toString());
        const place: PlaceType = {
          name: parsed.name || parsed.label,
          description: parsed.description || null,
          lat: parsed.lat,
          lon: parsed.lon,
        };
        return place;
      } catch (error) {
        captureException(error, (scope) => {
          scope.clear();
          scope.setExtra('place', JSON.stringify(event.place));
          scope.setExtra('event', JSON.stringify(event));
          return scope;
        });
        return null;
      }
    } else {
      return null;
    }
  }, [event]);

  if (isLoading || bringItemsLoading || keyHoldersLoading) {
    return (
      <Layout
        appBarConfig={{
          navigateBackPath: '/training/list',
          title: '',
          showProfile: false,
        }}
      >
        <EventInformationLoading />
      </Layout>
    );
  }

  if (!event) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (import.meta.env.VITE_UI_LIB === "shadcn") {
    return <div className="min-h-screen bg-background text-foreground">
      <AppBar
        className='!border-b !shadow-sm'
        title={event.title}
        onDrawerToggle={toggleSidebar}
        actions={
          <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatars/04.png" alt="@user" />
              <AvatarFallback className="bg-primary text-primary-foreground">ZK</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <main className='overflow-y-auto'>
        <div className="px-2 py-2 space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Startzeit</p>
                  <p className="text-sm text-muted-foreground">
                    {format(event.startingDateTime, "EEEE, dd. MMMM yyyy 'um' hh:mm 'Uhr'")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Dauer</p>
                  <p className="text-sm text-muted-foreground">
                    {format(event.startingDateTime, 'hh:mm')} -{' '}
                    {format(event.endDateTime, 'hh:mm')}
                  </p>
                </div>
              </div>

              {
                selectedEventPlace && <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEventPlace.name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedEventPlace.description}
                    </p>
                    {/* Map */}
                    <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border">
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
                    </div>
                  </div>
                </div>
              }

              <div>
                <p className="font-medium mb-2">Anwesenheit</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { }}
                    variant={event.user_state === 'Attending' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    <Check className="size-4 mr-1" />
                    Attend
                  </Button>
                  <Button
                    onClick={() => { }}
                    variant={event.user_state === 'Declined' ? 'destructive' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    <X className="size-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anwesenheit</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div>
                  <Item className='px-0 pt-0'>
                    <ItemMedia>
                      <CheckCircle2 className="size-5 text-success" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle> {event.attending_count} teilnehmend</ItemTitle>
                    </ItemContent>
                  </Item>
                  <Item className='px-0'>
                    <ItemMedia>
                      <XCircle className="size-5 text-error" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle> {event.declined_count} abgelehnt</ItemTitle>
                    </ItemContent>
                  </Item>
                </div>
                <Separator />

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Kommentare {' '}
                <Badge variant="secondary">2</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-0">
              <div className='space-y-2'>
                {
                  [
                    { userName: "Karl Wolf", id: 0, createdAt: new Date(), text: "Halloooo ich komme zum Training" },
                    { userName: "Franziska Stadler", id: 1, createdAt: new Date(), text: "Ich auchhhhh <3" },
                    { userName: "Max Mustermann", id: 2, createdAt: new Date(), text: "Ich bin Max Mustermann" },
                  ].map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-md">
                          {getInitials(comment.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-0">
                        <div className="flex items-center gap-2">
                          <p className="text-md font-medium">
                            {comment.userName}
                          </p>
                          <span className="text-md text-muted-foreground">
                            {format(comment.createdAt, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-md text-muted-foreground">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>


              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={1}
                />
                <Button
                  disabled={!commentText.trim()}
                  size="sm"
                  className="w-full"
                >
                  Add Comment
                </Button>
              </div>

              <Separator />

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  }

  return (
    <Layout
      appBarConfig={{
        navigateBackPath: '/training/list',
        title: event.title!,
        showProfile: false,
      }}
      appBarActions={
        <Has perm={['event.edit', 'event.cancel', 'event.delete', 'event.transform']} any>
          <>
            <IconButton sx={{ color: 'primary.contrastText', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu
              id="simple-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <Has perm={'event.edit'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(EditEventOptionsDialog);
                    if (result) {
                      await dialogs.open(CreateOrUpdateEventDialog, {
                        event: {
                          ...event,
                          items_enabled: false,
                          group: event.group?.id ?? null,
                        } as EventTable,
                        eventGroup: event.group,
                        option: result,
                        items: allItems,
                      });
                    }
                  }}
                >
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText primary={t('events.editEvent')} />
                </MenuItem>
              </Has>
              <Has perm={'event.transform'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    await dialogs.open(TransformEventDialog, {
                      user,
                      event,
                    });
                  }}
                >
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText primary={t('events.transformEventSeries')} />
                </MenuItem>
              </Has>
              <Has perm={'event.cancel'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(CancelTrainingDialog, event);
                    if (result) {
                      cancelTrainingMutation.mutate(
                        { event, isCancelled: !event.isCancelled },
                        {
                          onError: (error) => {
                            captureException(error);
                            notifications.show(error.message, { severity: 'error' });
                          },
                        }
                      );
                    }
                  }}
                >
                  <ListItemIcon>{event.isCancelled ? <DoNotDisturbOff /> : <DoNotDisturb />}</ListItemIcon>
                  <ListItemText primary={event.isCancelled ? 'Stattfinden' : 'Absagen'} />
                </MenuItem>
              </Has>
              <Has perm={'event.delete'}>
                <MenuItem
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(DeleteEventDialog, event);
                    if (result) {
                      deleteTrainingMutation.mutate(
                        { event, type: result, currentUser: user },
                        {
                          onSuccess: () => {
                            navigate('/training/list', { replace: true });
                          },
                          onError: (error) => {
                            captureException(error);
                            notifications.show(error.message, { severity: 'error' });
                          },
                        }
                      );
                    }
                  }}
                >
                  <ListItemIcon>
                    <Delete />
                  </ListItemIcon>
                  <ListItemText primary={t('events.deleteEvent')} />
                </MenuItem>
              </Has>
            </Menu>
          </>
        </Has>
      }
    >
      <PullToRefresh
        onRefresh={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: eventKeys.eventComments(selectedEventId) });
          queryClient.invalidateQueries({ queryKey: eventKeys.event(selectedEventId) });
          queryClient.invalidateQueries({ queryKey: eventKeys.eventAttendance(selectedEventId) });
        }}
      >
        <EventInformation
          t={t}
          keyHolders={keyHolders}
          event={event}
          selectedEventPlace={selectedEventPlace}
          fetchMode={fetchMode}
        />
        <Has perm={'event.admin.view'}>
          <EventAdminInformation event={event} />
        </Has>
      </PullToRefresh>
    </Layout>
  );
};

export default EventInformationProvider;
