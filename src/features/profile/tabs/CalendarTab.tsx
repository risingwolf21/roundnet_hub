import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { UserWithGroups } from "@/types/supabaseTypes";
import { iOS } from "@/utils";
import { CalendarSync, Volleyball } from "lucide-react";
import { useCallback } from "react";
import { Day } from "react-day-picker";
import { isSameDay } from "date-fns";

export const CalendarTab = ({ userAttendance, user }: { userAttendance: Date[]; user: UserWithGroups }) => {
  const hasEntry = useCallback(
    (date: Date) => userAttendance.some((activeDate) => isSameDay(activeDate, date)),
    [userAttendance]
  );

  const syncCalendar = () => {
    if (iOS) {
      window.location.href = `webcal://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ical/${user.id}/calendar.ics`;
    } else {
      window.location.href = `https://calendar.google.com/calendar/render?cid=webcal://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ical/${user.id}/calendar.ics`;
    }
  };

  return (
    <>
      <CardContent>
        <div className="flex flex-col gap-4 ">
          <Alert variant={"info"}>
            <AlertTitle>Kalender</AlertTitle>
            <AlertDescription>
              Zeige alle deine zugesagten Events in deinem persönlichen Kalender an.
            </AlertDescription>
          </Alert>
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="w-full">
              <Calendar
                mode="single"
                weekStartsOn={1}
                month={new Date()}
                className="w-full"
                classNames={{
                  root: "w-full",
                  months: "w-full",
                  month_grid: "w-full",
                  month: "w-full",
                  table: "w-full",
                  weekdays: "flex w-full",
                  weekday: "flex-1 text-center",
                  week: "flex w-full mt-2",
                  day: "flex-1 aspect-square p-0",
                }}
                components={{
                  // eslint-disable-next-line @eslint-react/no-nested-component-definitions
                  Nav: () => <></>,
                  // eslint-disable-next-line @eslint-react/no-nested-component-definitions
                  MonthCaption: () => <></>,
                  // eslint-disable-next-line @eslint-react/no-nested-component-definitions
                  Day: ({ ...props }) => <Day {...props} className='w-full' />,
                  // eslint-disable-next-line @eslint-react/no-nested-component-definitions
                  DayButton: ({ children, modifiers, day, ...props }) => {
                    const isActive = hasEntry(day.date);
                    return (
                      <CalendarDayButton day={day} modifiers={modifiers} {...props} disabled className="!opacity-100 !h-auto !w-full aspect-square">
                        {isActive ? <Volleyball className="size-full max-w-6 max-h-6 text-success" /> : children}
                      </CalendarDayButton>
                    );
                  },
                }}
              />
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant={"outline"} onClick={syncCalendar}>
                <CalendarSync />
                Kalender synchronisieren
              </Button>
            </CardFooter>
          </Card>
        </div>
      </CardContent>
    </>
  );
};
