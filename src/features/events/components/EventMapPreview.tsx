import React from 'react';
import { Box } from '@mui/material';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { PlaceType } from '../types';

type Props = {
  place: PlaceType;
};

const EventMapPreview = ({ place }: Props) => (
  <Box sx={{ p: 0, width: '100%', maxHeight: '10%' }}>
    <Box
      component="button"
      onClick={() => {
        window.open(
          `https://www.google.com/maps/dir/?api=1&travelmode=bicycling&destination=${place.lat},${place.lon}`,
          '_blank'
        );
      }}
      sx={{
        position: 'absolute',
        zIndex: 999,
        width: '100%',
        height: '150px',
        border: 'none',
        background: 'transparent',
      }}
    />
    <MapContainer
      style={{ width: '100%', height: '150px' }}
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
);

export default EventMapPreview;