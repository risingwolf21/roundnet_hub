import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { EventsUserView } from '@/types/supabaseTypes';
import { nameOfRecurrence } from '@/utils';
import { cn } from '@/lib/utils';
import { add, closestTo, differenceInCalendarDays, differenceInMinutes, isAfter, isSameDay } from 'date-fns';
import { toNumber } from 'lodash';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  LucideIcon,
  MapPin,
  Moon,
  Sun,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaceType } from '../../types';
import { InfoRow } from '../InfoRow';

const EventLocationMap = lazy(() => import('./EventLocationMap'));

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

type WeatherData = {
  icon: string;
  temperature: string;
  wind_speed: string;
  description: string;
};

export const EventWeatherData = ({ place, date }: { place: PlaceType; date: Date | null }) => {
  const { i18n } = useTranslation();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!import.meta.env.VITE_OPENWEATHER_API_KEY || !date) return;
    if (isAfter(date, add(new Date(), { days: 5 }))) return;

    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${place.lat}&lon=${place.lon}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric&lang=${i18n.resolvedLanguage === 'en' ? 'en' : 'de'}`
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
  }, [place, date, i18n.resolvedLanguage]);

  if (!weatherData) return null;

  return (
    <InfoRow
      icon={iconMap[weatherData.icon] ?? Cloud}
      title={`${weatherData.temperature}°C · ${weatherData.wind_speed} km/h`}
      subtitle={weatherData.description}
    />
  );
};

const EventDetailsTab = ({ event, selectedEventPlace }: { event: EventsUserView; selectedEventPlace: PlaceType | null }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const start = new Date(event.startingDateTime);
  const meeting = event.meetingDateTime ? new Date(event.meetingDateTime) : null;
  const minutesBefore = meeting ? differenceInMinutes(start, meeting) : 0;
  const hasRecurrence = event.recurrence !== "None";

  return (
    <TabsContent value="information" className="m-0">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className={cn("whitespace-pre-wrap leading-relaxed", event.description ? "text-foreground/90" : "text-muted-foreground")}>
            {event.description || t('events.detailsTab.noDescription')}
          </p>

          {(meeting || hasRecurrence) && (
            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              {meeting && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('events.detailsTab.meetingPoint')}</p>
                  <p className="font-semibold tabular-nums">
                    {isSameDay(meeting, start)
                      ? new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(meeting)
                      : new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(meeting)}
                    {minutesBefore > 0 && ` · ${t('events.detailsTab.minutesBefore', { count: minutesBefore })}`}
                  </p>
                </div>
              )}
              {hasRecurrence && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('events.detailsTab.recurrence')}</p>
                  <p className="font-semibold">{nameOfRecurrence(event.recurrence)}</p>
                </div>
              )}
            </div>
          )}

          {selectedEventPlace && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedEventPlace.lat},${selectedEventPlace.lon}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('events.detailsTab.planRouteTo', { place: selectedEventPlace.name })}
              className="relative block h-40 w-full overflow-hidden rounded-lg border bg-muted"
            >
              <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse" />}>
                <EventLocationMap
                  lat={selectedEventPlace.lat}
                  lon={selectedEventPlace.lon}
                  style={{ width: '100%', height: '100%', zIndex: 10 }}
                />
              </Suspense>
              <span className="absolute right-2.5 bottom-2.5 z-20 flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {t('events.information.planRoute')}
              </span>
            </a>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default EventDetailsTab;
