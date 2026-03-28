import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlaceType } from './types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Textarea } from '@/components/ui/textarea';
import { EventsUserView } from '@/types/supabaseTypes';
import { Separator } from '@base-ui/react/separator';
import { format } from 'date-fns';
import { Calendar, Check, CheckCircle2, Clock, MapPin, X, XCircle } from 'lucide-react';
import { TFunction } from 'node_modules/i18next/typescript/t';
import { useState } from "react";
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

type EventInformationProps = {
  event: EventsUserView;
  selectedEventPlace: PlaceType | null;
  keyHolders: FullItemHolder[];
  t: TFunction;
  fetchMode: 'past' | 'upcoming';
};

const EventInformationShadcn = ({ event, selectedEventPlace }: EventInformationProps) => {

  const [commentText, setCommentText] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return <div className="min-h-screen bg-background text-foreground">
    <AppBar
      className='!border-b !shadow-sm'
      title={event.title}
      primaryAction="back"
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
};

export default EventInformationShadcn;
