import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item } from '@/components/ui/item';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { EventsUserView, FullAttendance } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { isBefore } from 'date-fns';
import { Check } from 'lucide-react';
import { useMemo } from 'react';

const AttendanceTab = ({
  event,
  attendance,
  changeAttendance,
}: {
  event: EventsUserView;
  attendance: FullAttendance[];
  changeAttendance: ({ user, event, newState }: { user: User; event: EventsUserView; newState: EventAttendance }) => void;
}) => {
  const dialogs = useDialogs();

  const attending = useMemo(
    () => attendance.filter((x) => x.state === 'Attending' || x.state === 'AttendingAsTrainer' || x.state === 'AttendingAsTrial').sort((a, b) => isBefore(a.lastUpdate, b.lastUpdate) ? -1 : 1),
    [attendance]
  );
  const declined = useMemo(() => attendance.filter((x) => x.state === 'Declined'), [attendance]);
  const requested = useMemo(() => attendance.filter((x) => x.state === 'RequestedAttendance'), [attendance]);
  const waiting = useMemo(() => attendance.filter((x) => x.state === 'Waiting' || x.state === 'WaitingAsTrial'), [attendance]);

  return (
    <TabsContent value="attendance" className="m-0">
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
                  <Item key={attendance.user.id} className="flex items-center gap-3 p-0 border-b" onClick={() => dialogs.userProfile(attendance.user.id)}>
                    <Avatar>
                      <AvatarImage src={attendance.user.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(attendance.user.name ?? "User")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attendance.user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {attendance.state === "AttendingAsTrainer" && "Trainer"}
                        {attendance.state === "AttendingAsTrial" && "Probetraining"}
                      </p>
                    </div>
                  </Item>
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
                      <AvatarImage src={attendance.user.avatarUrl || ""} />
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
                      <AvatarImage src={attendance.user.avatarUrl || ""} />
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
                      <AvatarImage src={attendance.user.avatarUrl || ""} />
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
  );
};

export default AttendanceTab;
