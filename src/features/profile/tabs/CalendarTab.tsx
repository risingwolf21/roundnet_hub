import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { DangerZone } from "@/components/DangerZone";
import { useDialogs } from "@/contexts/DialogsProvider";
import { useCalendarFeedToken, useResetCalendarFeedToken } from "@/tanstack/user";
import { iOS } from "@/utils";
import { CalendarSync, Copy, RotateCcw, Volleyball } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Day } from "react-day-picker";
import { isSameDay } from "date-fns";
import { toast } from "sonner";

// webcal:// links only open in Apple Calendar (iPhone, iPad, Mac); elsewhere they do nothing.
const appleDevice = iOS || (typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent));

export const CalendarTab = ({ userAttendance }: { userAttendance: Date[] }) => {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const { data: token, isError, refetch } = useCalendarFeedToken();
  const resetToken = useResetCalendarFeedToken();

  const hasEntry = useCallback(
    (date: Date) => userAttendance.some((activeDate) => isSameDay(activeDate, date)),
    [userAttendance]
  );

  const feedUrl = token ? `webcal://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ical/${token}/calendar.ics` : null;

  const openApple = () => {
    if (feedUrl) window.location.href = feedUrl;
  };

  // Google Calendar can only add a subscription on calendar.google.com; it then syncs to the Google Calendar app.
  const openGoogle = () => {
    if (!feedUrl) return;
    const newWindow = window.open(
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    if (newWindow) newWindow.opener = null;
  };

  const copyLink = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl.replace(/^webcal:/, 'https:'));
      toast.success(t('profile.calendar.copied'));
    } catch {
      toast.error(t('profile.calendar.copyFailed'));
    }
  };

  const reset = async () => {
    const ok = await dialogs.confirm(t('profile.calendar.resetConfirm'), {
      okText: t('profile.calendar.reset'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    resetToken.mutate(undefined, {
      onSuccess: () => toast.success(t('profile.calendar.resetSuccess')),
      onError: () => toast.error(t('profile.calendar.resetError')),
    });
  };

  return (
    <>
      <CardContent>
        <div className="flex flex-col gap-4 ">
          <Alert variant={"info"}>
            <AlertTitle>{t('profile.calendar.title')}</AlertTitle>
            <AlertDescription>
              {t('profile.calendar.description')}
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
            <CardFooter className="flex flex-col gap-2">
              {isError ? (
                <Alert variant={"warning"}>
                  <AlertTitle>{t('profile.calendar.loadError')}</AlertTitle>
                  <AlertDescription>
                    <Button variant={"outline"} size={"sm"} onClick={() => refetch()}>
                      {t('profile.calendar.retry')}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Button variant={"outline"} className="w-full" disabled={!feedUrl} onClick={openGoogle}>
                    <CalendarSync />
                    {t('profile.calendar.google')}
                  </Button>
                  {appleDevice && (
                    <Button variant={"outline"} className="w-full" disabled={!feedUrl} onClick={openApple}>
                      <CalendarSync />
                      {t('profile.calendar.apple')}
                    </Button>
                  )}
                  <Button variant={"outline"} className="w-full" disabled={!feedUrl} onClick={copyLink}>
                    <Copy />
                    {t('profile.calendar.copy')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('profile.calendar.copyHint')}</p>
                </>
              )}
            </CardFooter>
          </Card>
          <DangerZone
            description={t('profile.calendar.resetDescription')}
            actionLabel={t('profile.calendar.reset')}
            icon={<RotateCcw />}
            loading={resetToken.isPending}
            onAction={reset}
          />
        </div>
      </CardContent>
    </>
  );
};
