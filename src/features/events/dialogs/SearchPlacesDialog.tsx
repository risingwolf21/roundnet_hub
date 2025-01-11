import { ArrowBack, MyLocation } from '@mui/icons-material';
import {
  Alert,
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
} from '@mui/material';
import L, { LatLng } from 'leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { RawResult } from 'leaflet-geosearch/dist/providers/openStreetMapProvider';
import { SearchResult } from 'leaflet-geosearch/dist/providers/provider';
import { toNumber } from 'lodash';
import React, { useEffect, useState } from 'react';
import { SlideUpTransition } from '../../../utils';
import { PlaceType, SearchPlacesDialogProps } from '../types';

const SearchPlacesDialog = ({ open, handleClose, placeSelected }: SearchPlacesDialogProps) => {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult<RawResult>[]>();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const provider = new OpenStreetMapProvider();

  const search = () => {
    provider.search({ query: value }).then(function (results) {
      setResults(results);
      console.log(results);
    });
  };

  const keyPress = (e: any) => {
    if (e.keyCode === 13) {
      search();
    }
  };

  // define the function that finds the users geolocation
  const getUserLocation = () => {
    // if geolocation is supported by the users browser
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        if (permissionStatus.state === 'denied') {
          window.location.href = 'app-settings:location';
        } else {
          // get the current users location
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // save the geolocation coordinates in two variables
              const { latitude, longitude } = position.coords;
              // update the value of userlocation variable
              setUserLocation({ latitude, longitude });
              setError(null);
            },
            // if there was an error getting the users location
            (error) => {
              console.error('Error getting user location:', error);
            }
          );
        }
      });
    }
    // if geolocation is not supported by the users browser
    else {
      console.error('Geolocation is not supported by this browser.');
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
        {error && (
          <Alert sx={{ mt: 2 }} severity="error">
            <strong>{error}</strong>
          </Alert>
        )}
        {loading && <LinearProgress style={{ position: 'fixed', left: 0, top: 64, right: 0 }} />}
        <List>
          {results &&
            results.map((result) => (
              <ListItem
                divider
                key={result.label}
                onClick={() =>
                  placeSelected({
                    name: result.raw.display_name,
                    lat: toNumber(result.raw.lat),
                    lon: toNumber(result.raw.lon),
                  } as PlaceType)
                }
              >
                {userLocation && Number(result.raw.lat) && Number(result.raw.lon) && (
                  <ListItemAvatar>
                    {`${(
                      L.latLng(userLocation.latitude, userLocation.longitude).distanceTo(
                        L.latLng(Number(result.raw.lat), Number(result.raw.lon))
                      ) / 1000
                    ).toFixed(2)} km`}
                  </ListItemAvatar>
                )}
                <ListItemText primary={result.raw.display_name} secondary={result.raw.type} />
              </ListItem>
            ))}
        </List>
      </Box>
    </Dialog>
  );
};

export default SearchPlacesDialog;
