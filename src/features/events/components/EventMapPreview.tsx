import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { PlaceType } from '../types';

import { iOS } from '@/utils';
import Map from '@mui/icons-material/Map';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import { useDialogs } from '@toolpad/core';
import { MapsProviderDialog } from '../dialogs/MapsProviderDialog';

type Props = {
  place: PlaceType;
};

const EventMapPreview = ({ place }: Props) => {
  const dialogs = useDialogs();
  return (
    <Stack direction={'column'}>
      {place.name && (
        <ListItem dense>
          <ListItemAvatar>
            <ListItemIcon>
              <Map />
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText primary={place.name} secondary={place.description} />
        </ListItem>
      )}
      <ListItem>
        <ListItemAvatar />
        <Box
          component="button"
          onClick={async () => {
            if (iOS) {
              const result = await dialogs.open(MapsProviderDialog);
              if (result === 'apple_maps') {
                window.open(
                  `http://maps.apple.com/?daddr=${place.name}&sll=${place.lat},${place.lon}&z=10&t=s`,
                  '_blank'
                );
              } else if (result === 'google_maps') {
                window.open(
                  `https://www.google.com/maps/dir/?api=1&travelmode=bicycling&destination=${place.lat},${place.lon}`,
                  '_blank'
                );
              }
            } else {
              window.open(
                `https://www.google.com/maps/dir/?api=1&travelmode=bicycling&destination=${place.lat},${place.lon}`,
                '_blank'
              );
            }
          }}
          sx={{
            p: 0,
            zIndex: 999,
            border: 'none',
            background: 'transparent',
            width: '100%',
            borderRadius: '16px',
          }}
        >
          <MapContainer
            style={{ width: '100%', height: '150px', borderRadius: '16px' }}
            center={[place.lat, place.lon]}
            zoom={15}
            dragging={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            attributionControl={false}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[place.lat, place.lon]} interactive={false} />
          </MapContainer>
        </Box>
      </ListItem>
    </Stack>
  );
};

export default EventMapPreview;
