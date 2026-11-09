import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

// Vite/Rollup breaks Leaflet's default icon resolution; fix it once here.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function EventLocationMap({
  lat,
  lon,
  dragging = false,
  interactive = false,
  style,
}: {
  lat: number;
  lon: number;
  dragging?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <MapContainer
      style={style ?? { width: '100%', height: '100%' }}
      center={[lat, lon]}
      zoom={15}
      dragging={dragging}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      attributionControl={false}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lon]} interactive={interactive} />
    </MapContainer>
  );
}
