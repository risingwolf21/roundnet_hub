import SearchIcon from '@mui/icons-material/Search';
import { useNotifications } from '@toolpad/core/useNotifications';
import L, { LatLng } from 'leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { SearchResult } from 'leaflet-geosearch/dist/providers/provider.js';
import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { SlideUpTransition } from '../../../utils';
import { SearchPlacesDialogProps } from '../types';

import { Search, SearchIconWrapper, StyledInputBase } from '@/components/SearchBar';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Place from '@mui/icons-material/Place';
import Save from '@mui/icons-material/Save';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Popper from '@mui/material/Popper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type MySearchResult = Pick<SearchResult, 'x' | 'y'> & {
  name: string;
  description: string | null;
};

const locationMap = {
  'roundnet-karlsruhe': { latitude: 49.0069, longitude: 8.4037 },
  'munich-roundnet': { latitude: 48.1351, longitude: 11.5820 },
};

const defaultLocation = locationMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof locationMap) || 'roundnet-karlsruhe'];

const SearchPlacesDialog = ({ open, handleClose, placeSelected }: SearchPlacesDialogProps) => {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult<any>[]>();
  const [loading, setLoading] = useState(false);
  const notifications = useNotifications();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(defaultLocation);
  const [selectedPlace, setSelectedPlace] = useState<MySearchResult | null>(null);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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
    } else {
      notifications.show(`Geolocation is not supported by this browser.`, { severity: 'error' });
    }
  }, [notifications]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const provider = new OpenStreetMapProvider({ params: { addressdetails: 1, 'accept-language': 'de' } });

  const search = () => {
    setLoading(true);
    provider
      .search({ query: value })
      .then(function (results) {
        setResults(results);
        console.log(results);
      })
      .finally(() => setLoading(false));
  };

  const keyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      search();
      setAnchorEl(e.currentTarget);
    }
  };

  const setPlaceFromLatLon = (lat: number, lon: number) => {
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=de`)
      .then((res) => res.json())
      .then((res) => {
        const street = (res.address.road && res.address.house_number) ? `${res.address.road} ${res.address.house_number}` : null;

        const address = (res.address.road && res.address.city && res.address.house_number && res.address.postcode)
          ? `${street}, ${res.address.postcode} ${res.address.city}`
          : "";
        const name = (res.name) ? res.name : (street) ? street : "Unbenannter Ort";

        console.log(street, address, name)
        setSelectedPlace({
          x: res.lon,
          y: res.lat,
          name: name,
          description: address || null,
        });
      })
      .finally(() => setLoading(false));
  };

  function MyComponent() {
    const map = useMapEvents({
      click: (event) => {
        if (loading) return;
        map.locate();
        setPlaceFromLatLon(event.latlng.lat, event.latlng.lng);
        map.setView([event.latlng.lat, event.latlng.lng], map.getZoom());
      },
    });
    return null;
  }

  const SearchResults = () => {
    const map = useMap();
    if (!results || results?.length < 1) return null;
    return (
      <Popper
        sx={(theme) => ({ zIndex: 1400, background: 'white', borderRadius: theme.shape.borderRadius })}
        open={openPopOver}
        anchorEl={anchorEl}
        placement={'bottom-start'}
      >
        <List>
          {results?.map((x) => (
            <ListItemButton
              onClick={() => {
                setAnchorEl(null);
                setPlaceFromLatLon(x.y, x.x);
                map.setView([x.y, x.x], map.getZoom());
              }}
            >
              <ListItemAvatar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pr: 2 }}>
                <Avatar sx={{ width: 30, height: 30, backgroundColor: 'rgba(189, 189, 189, 0.5)' }}>
                  <Place sx={{ width: 20, height: 20, color: 'rgba(0,0,0,0.8)' }} />
                </Avatar>
                {userLocation &&
                  x.y &&
                  x.x &&
                  getDistance(
                    L.latLng(userLocation.latitude, userLocation.longitude),
                    L.latLng(Number(x.y), Number(x.x))
                  )}
              </ListItemAvatar>
              <ListItemText primary={x.label} />
            </ListItemButton>
          ))}
        </List>
      </Popper>
    );
  };

  const openPopOver = Boolean(anchorEl);

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton size="large" edge="start" color="inherit" aria-label="close dialog" onClick={handleClose}>
              <ArrowBack />
            </IconButton>
            <Search sx={{ flexGrow: 1 }}>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <div>
                <StyledInputBase
                  sx={{ width: '100% !important' }}
                  placeholder="Suche nach einem Ort"
                  inputProps={{ 'aria-label': 'search' }}
                  value={value}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => keyPress(e)}
                  onFocus={(e: { currentTarget: React.SetStateAction<HTMLElement | null>; }) => setAnchorEl(e.currentTarget)}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setValue(e.target.value)}
                />
              </div>
            </Search>
          </Toolbar>
        </AppBar>
        {loading && <LinearProgress style={{ position: 'fixed', left: 0, top: 64, right: 0 }} />}
        <Box>
          <MapContainer
            style={{ width: '100%', height: 'calc(100svh - 64px)' }}
            center={userLocation ? [userLocation?.latitude, userLocation?.longitude] : undefined}
            zoom={16}
          >
            <MyComponent />
            <SearchResults />
            {selectedPlace && <Marker position={[selectedPlace.y, selectedPlace.x]} />}

            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </MapContainer>
        </Box>
        {selectedPlace && (
          <Fab
            sx={{ position: 'absolute', right: '16px', bottom: '16px' }}
            onClick={() =>
              placeSelected({
                description: selectedPlace.description,
                name: selectedPlace.name,
                lat: selectedPlace.y,
                lon: selectedPlace.x,
              })
            }
          >
            <Save></Save>
          </Fab>
        )}
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
