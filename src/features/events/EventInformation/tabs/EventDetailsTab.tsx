import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { EventsUserView } from '@/types/supabaseTypes';
import { nameOfRecurrence } from '@/utils';
import { Separator } from '@base-ui/react/separator';
import { add, closestTo, differenceInCalendarDays, format, isAfter } from 'date-fns';
import { toNumber } from 'lodash';
import {
  Activity,
  Clock,
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
    <div className="flex items-start gap-3 text-sm text-foreground truncate">
      {iconMap[weatherData.icon] && (() => {
        const IconComponent = iconMap[weatherData.icon];
        return <IconComponent className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
      })()}
      <div>
        <p className="font-medium truncate">{`${weatherData.temperature}°C · ${weatherData.wind_speed}km/h`}</p>
        <p className="text-muted-foreground text-xs mt-0.5 truncate">{weatherData.description}</p>
      </div>
    </div>
  );
};

const EventDetailsTab = ({ event, selectedEventPlace }: { event: EventsUserView; selectedEventPlace: PlaceType | null }) => {
  const { t } = useTranslation();
  return (
    <TabsContent value="information" className="space-y-4 m-0">
      <Card className="pt-0">
        <CardHeader className="border-b !py-2">
          <div className="flex justify-between items-center !p-0">
            <CardTitle className="text-lg flex items-center">
              {t('events.detailsTab.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-4 text-foreground/90">
          <div>
            <h4 className="font-semibold mb-1 text-foreground">{t('events.detailsTab.description')}</h4>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {event.description || t('events.detailsTab.noDescription')}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {event.meetingDateTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-muted-foreground text-xs block">{t('events.detailsTab.meetingPoint')}</span>
                  <span className="font-medium">{format(event.meetingDateTime, "dd.MM.yyyy HH:mm")}</span>
                </div>
              </div>
            )}

            {event.recurrence !== "None" && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-muted-foreground text-xs block">{t('events.detailsTab.recurrence')}</span>
                  <span className="font-medium">{nameOfRecurrence(event.recurrence)}</span>
                </div>
              </div>
            )}
          </div>

          {selectedEventPlace && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{t('events.detailsTab.location')}</h4>
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
                      {t('events.detailsTab.planRouteHere')}
                    </div>
                  </div>
                  <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse rounded-2xl" />}>
                    <EventLocationMap
                      lat={selectedEventPlace.lat}
                      lon={selectedEventPlace.lon}
                      style={{ width: '100%', height: '100%', borderRadius: '16px', zIndex: 10 }}
                    />
                  </Suspense>
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default EventDetailsTab;
