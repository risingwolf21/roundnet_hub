import { Map } from '@mui/icons-material';
import { Box, ListItem, ListItemAvatar, ListItemIcon, ListItemText, Stack } from '@mui/material';
import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { PlaceType } from '../types';

type Props = {
  place: PlaceType;
};

const EventMapPreview = ({ place }: Props) => {

  return <Stack direction={"column"}>
    <ListItem dense>
      <ListItemAvatar>
        <ListItemIcon>
          <Map />
        </ListItemIcon>
      </ListItemAvatar>
      <ListItemText primary={place.name} />
    </ListItem>
    <ListItem>
      <ListItemAvatar />
      <Box
        component="button"
        onClick={() => {
          window.open(
            `https://www.google.com/maps/dir/?api=1&travelmode=bicycling&destination=${place.lat},${place.lon}`,
            '_blank'
          );
        }}
        sx={{
          p: 0,
          zIndex: 999,
          border: 'none',
          background: 'transparent',
          width: "100%",
          borderRadius: "16px"
        }}
      >
        <MapContainer
          style={{ width: '100%', height: '150px', borderRadius: "16px" }}
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
}

export default EventMapPreview;