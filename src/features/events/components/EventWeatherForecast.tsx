import { ListItem, ListItemAvatar, ListItemIcon, ListItemText } from '@mui/material';
import { closestTo, differenceInCalendarDays } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { PlaceType } from '../types';
import { toNumber } from 'lodash';

type Props = {
  place: PlaceType;
  date: Date
};

type WeatherData = {
  icon: string
  temperature: string
  wind_speed: string
  description: string
}

const EventWeatherForecast = ({ place, date }: Props) => {

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);


  useEffect(() => {
    if (!process.env.REACT_APP_OPENWEATHER_API_KEY)
      return;
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${place.lat}&lon=${place.lon}&appid=${process.env.REACT_APP_OPENWEATHER_API_KEY}&units=metric&lang=de`)
      .then(res => res.json())
      .then(async (json) => {
        const dates = json?.list?.map((item: any) => new Date(item.dt * 1000)) ?? [];

        const closestDate = closestTo(date, dates);

        const result = json?.list?.find((item: any) => new Date(item.dt * 1000).getTime() === closestDate?.getTime() && Math.abs(differenceInCalendarDays(closestDate, date)) <= 1) ?? null;

        if (result) {
          const icon = await cropTransparentBorder(`https://openweathermap.org/img/wn/${result.weather[0].icon}@2x.png`)

          setWeatherData({
            icon: icon,
            temperature: toNumber(result.main.temp).toFixed(0),
            wind_speed: toNumber(result.wind.speed).toFixed(0),
            description: result.weather[0].description
          })
        }
      })
  }, [place, date])

  async function cropTransparentBorder(imageUrl: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx!.drawImage(img, 0, 0);

    const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let top = canvas.height, left = canvas.width, right = 0, bottom = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) { // Pixel ist nicht transparent
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }

    const width = right - left;
    const height = bottom - top;

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    croppedCtx!.drawImage(canvas, left, top, width, height, 0, 0, width, height);

    return croppedCanvas.toDataURL(); // oder croppedCanvas als <img> verwenden
  }


  if (!weatherData)
    return null;

  return <ListItem sx={{ py: 0 }} dense>
    <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex', minWidth: "40px" }}>
      <ListItemIcon>
        <img alt="weather-icon" src={weatherData.icon} style={{ objectFit: "contain" }} width={24} height={24} />
      </ListItemIcon>
    </ListItemAvatar>
    <ListItemText primary={`${weatherData.temperature}°C · ${weatherData.wind_speed}km/h`} secondary={weatherData.description} />
  </ListItem>
}

export default EventWeatherForecast;