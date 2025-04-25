import { ArrowBack, MyLocation, Place } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Dialog,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNotifications } from '@toolpad/core/useNotifications';
import L, { LatLng } from 'leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { SearchResult } from 'leaflet-geosearch/dist/providers/provider';
import { toNumber } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { SlideUpTransition } from '../../../utils';
import { PlaceType, SearchPlacesDialogProps } from '../types';

const SearchPlacesDialog = ({ open, handleClose, placeSelected }: SearchPlacesDialogProps) => {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult<any>[]>();
  const [loading, setLoading] = useState(false);
  const notifications = useNotifications();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);


  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        if (permissionStatus.state === 'denied') {
          window.location.href = 'app-settings:location';
        } else {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation({ latitude, longitude });
            },
            (error) => {
              notifications.show(`Error getting user location: \n ${error.message}`, { severity: 'error' });
            }
          );
        }
      });
    }
    else {
      notifications.show(`Geolocation is not supported by this browser.`, { severity: 'error' });
    }
  }, [notifications])

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const provider = new OpenStreetMapProvider({ params: { "addressdetails": 1 } });

  const search = () => {
    setLoading(true);
    provider
      .search({ query: value })
      .then(function (results) {
        setResults(results);
      })
      .finally(() => setLoading(false));
  };

  const keyPress = (e: any) => {
    if (e.keyCode === 13) {
      search();
    }
  };


  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box>
        <Toolbar sx={{ pt: 'env(safe-area-inset-top)' }}>
          <TextField
            fullWidth
            slotProps={{
              input: {
                style: { paddingLeft: 0 },
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton onClick={handleClose}>
                      <ArrowBack />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={getUserLocation}>
                      <MyLocation />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              pt: 1,
              pb: 1,
              pl: 0,
              '& fieldset': { borderRadius: '30px' },
              '& input': { pt: 1.5, pb: 1.5 },
              '& div': { pl: 1 },
            }}
            placeholder="Search here"
            value={value}
            onKeyDown={keyPress}
            onChange={(e) => setValue(e.target.value)}
          />
        </Toolbar>
        {loading && <LinearProgress style={{ position: 'fixed', left: 0, top: 64, right: 0 }} />}
        <List>
          {results &&
            results.map((result, index) => (
              <ListItem
                divider
                key={index}
                onClick={() => {
                  const address = result.raw.address;
                  const name = address
                    ? `${result.raw.name}, ${address.road} ${address.house_number}, ${address.postcode} ${address.city}`
                    : result.raw.display_name;
                  placeSelected({
                    name,
                    lat: toNumber(result.raw.lat),
                    lon: toNumber(result.raw.lon),
                  } as PlaceType)
                }}
              >
                <ListItemAvatar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pr: 2 }}>
                  <Avatar sx={{ width: 30, height: 30, backgroundColor: 'rgba(189, 189, 189, 0.5)' }}>
                    <Place sx={{ width: 20, height: 20, color: 'rgba(0,0,0,0.8)' }} />
                  </Avatar>
                  {userLocation &&
                    result.raw.lat &&
                    result.raw.lon &&
                    getDistance(
                      L.latLng(userLocation.latitude, userLocation.longitude),
                      L.latLng(Number(result.raw.lat), Number(result.raw.lon))
                    )}
                </ListItemAvatar>
                <ListItemText
                  primary={result.raw.name ?? result.raw.display_name}
                  secondary={result.raw.display_name
                    .split(',')
                    .filter((y: any) => y.trim() !== result.raw.name)
                    .join(', ')}
                  slotProps={{
                    primary: {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                    secondary: {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </ListItem>
            ))}
        </List>
      </Box>
    </Dialog>
  );

  function getDistance(from: LatLng, to: LatLng) {
    const distance = from.distanceTo(to) / 1000;

    if (distance > 1000) return null;

    let distanceFixed = distance.toFixed(0);

    if (distance < 10) distanceFixed = distance.toFixed(2);
    else if (distance < 100) distanceFixed = distance.toFixed(1);

    return <Typography sx={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.6)' }}>{`${distanceFixed}km`}</Typography>;
  }
};

export default SearchPlacesDialog;
