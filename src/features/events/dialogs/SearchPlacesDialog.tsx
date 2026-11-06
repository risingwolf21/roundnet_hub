import { SearchResult } from 'leaflet-geosearch/dist/providers/provider.js';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { PlaceType } from '../types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DialogProps } from '@/contexts/DialogsProvider';
import { TENANT } from '@/tenant/config';
import { LatLng } from 'leaflet';

import { Map, MapLocateControl, MapSearchControl, MapTileLayer } from '@/components/ui/map';
import '@/styles/user-location.css';
import L from 'leaflet';
import { toast } from 'sonner';
import i18n from 'i18next';

type MySearchResult = Pick<SearchResult, 'x' | 'y'> & {
  name: string;
  description: string | null;
};

const defaultLocation = TENANT.defaultMapLocation;

const parseAddress = (raw: any) => {
  const addr = raw.address || raw;
  const street = addr.road && addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road || null;
  const cityInfo = addr.postcode && addr.city ? `${addr.postcode} ${addr.city}` : addr.city || '';

  const address = street && cityInfo ? `${street}, ${cityInfo}` : street || cityInfo || '';
  const name = raw.name || street || address || i18n.t('events.searchPlaces.unnamedPlace');

  return { name, description: address || null };
};

function MapFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 18, { duration: 0.5 });
    }
  }, [target, map]);

  return null;
}

const SearchPlacesDialog = ({ open, onClose }: DialogProps<PlaceType, PlaceType | null>) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MySearchResult | null>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  const setPlaceFromLatLon = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=de`
      );
      const data = await response.json();
      const { name, description } = parseAddress(data);

      setSelectedPlace({ x: lon, y: lat, name, description });
    } finally {
      setLoading(false);
    }
  }, []);

  function MapEvents() {
    useMapEvents({
      click: (e) => {
        if (!loading) setPlaceFromLatLon(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogBody className='p-0'>
        <Map
          className='size-full'
          center={[defaultLocation.latitude, defaultLocation.longitude]}>
          <MapTileLayer />
          <MapLocateControl
            className="absolute bottom-4 right-4"
            onLocationFound={(location) =>
              setUserLocation(location.latlng)
            }
            onLocationError={(error) => toast.error(error.message)}

            watch />
          <MapSearchControl
            className="w-full left-0 top-0 p-2 bg-white"
            onPlaceSelect={(place) => {

              const addr = place.properties;
              const street = addr.street && addr.housenumber ? `${addr.street} ${addr.housenumber}` : addr.street || null;
              const cityInfo = addr.postcode && addr.city ? `${addr.postcode} ${addr.city}` : addr.city || '';

              const address = street && cityInfo ? `${street}, ${cityInfo}` : street || cityInfo || '';
              const name = addr.name || street || address || t('events.searchPlaces.unnamedPlace');

              setSelectedPlace({ x: place.geometry.coordinates[0], y: place.geometry.coordinates[1], name, description: address });
            }} />

          {
            selectedPlace && (
              <Marker key={selectedPlace.name} position={[selectedPlace.y, selectedPlace.x]} />
            )
          }

          <MapFlyTo target={selectedPlace ? { lat: selectedPlace.y, lng: selectedPlace.x } : null} />

          <MapEvents />

          {
            userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'user-location-marker', // Deine Hauptklasse
                  html: `<div class="pulse-marker"></div>`, // Das Element für das CSS
                  iconSize: [20, 20],
                  iconAnchor: [10, 10], // Zentriert den Marker auf den Koordinaten
                })}
                zIndexOffset={1000} // Sorgt dafür, dass der Punkt immer über anderen Markern liegt
              />
            )
          }
        </Map>
      </DialogBody>
      <DialogFooter variant={"fullscreen"} className='flex flex-col w-full max-w-lg mx-auto p-4'>
        <div className='w-full max-w-lg'>
          <div>
            {
              selectedPlace ? (
                <div className='flex flex-col gap-2'>
                  <Input
                    placeholder={t('events.searchPlaces.name')}
                    value={selectedPlace.name}
                    onChange={(e) => setSelectedPlace({ ...selectedPlace, name: e.target.value })}
                    className='text-base font-semibold'
                  />

                  <Input
                    placeholder={t('costs.description')}
                    value={selectedPlace.description ?? ''}
                    onChange={(e) => setSelectedPlace({ ...selectedPlace, description: e.target.value })}
                    className='text-base text-muted-foreground'
                  />
                </div>
              ) : (
                <p className='text-center text-muted-foreground'>{t('events.searchPlaces.hint')}</p>
              )
            }
          </div>
          <div className='flex flex-row gap-2 w-full mt-4'>
            <Button variant={"outline"} className={"flex-1"} onClick={() => onClose(null)}>
              {t('common.cancel')}
            </Button>
            {
              selectedPlace && <Button className={"flex-1"} onClick={() =>
                onClose({
                  description: selectedPlace.description,
                  name: selectedPlace.name,
                  lat: selectedPlace.y,
                  lon: selectedPlace.x,
                })
              }>
                {t('common.save')}
              </Button>
            }
          </div>
        </div>
      </DialogFooter>

    </DialogContent>
  </Dialog >

  // return (
  //   <Dialog fullScreen open={open} onClose={handleClose}>
  //     <Box sx={{ flexGrow: 1 }}>
  //       <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
  //         <Toolbar>
  //           <IconButton size="large" edge="start" color="inherit" aria-label="close dialog" onClick={handleClose}>
  //             <ArrowBack />
  //           </IconButton>
  //           <Search sx={{ flexGrow: 1 }}>
  //             <SearchIconWrapper>
  //               <SearchIcon />
  //             </SearchIconWrapper>
  //             <div>
  //               <StyledInputBase
  //                 sx={{ width: '100% !important' }}
  //                 placeholder="Suche nach einem Ort"
  //                 inputProps={{ 'aria-label': 'search' }}
  //                 value={value}
  //                 onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => keyPress(e)}
  //                 onFocus={(e: { currentTarget: React.SetStateAction<HTMLElement | null> }) =>
  //                   setAnchorEl(e.currentTarget)
  //                 }
  //                 onChange={(e: { target: { value: React.SetStateAction<string> } }) => setValue(e.target.value)}
  //               />
  //             </div>
  //           </Search>
  //         </Toolbar>
  //       </AppBar>
  //       {loading && <LinearProgress style={{ position: 'fixed', left: 0, top: 64, right: 0 }} />}
  //       <Box>
  //         <MapContainer
  //           style={{ width: '100%', height: 'calc(100svh - 64px)' }}
  //           center={userLocation ? [userLocation?.latitude, userLocation?.longitude] : undefined}
  //           zoom={16}
  //         >
  //           <MyComponent />
  //           <SearchResults
  //             results={results ?? []}
  //             userLocation={userLocation}
  //             anchorEl={anchorEl}
  //             onClick={(latlng) => {
  //               setAnchorEl(null);
  //               setPlaceFromLatLon(latlng.lat, latlng.lng);
  //             }}
  //           />
  //           {selectedPlace && <Marker position={[selectedPlace.y, selectedPlace.x]} />}

  //           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  //         </MapContainer>
  //       </Box>
  //       {selectedPlace && (
  //         <Fab
  //           sx={{ position: 'absolute', right: '16px', bottom: '16px' }}
  //           onClick={() =>
  //             placeSelected({
  //               description: selectedPlace.description,
  //               name: selectedPlace.name,
  //               lat: selectedPlace.y,
  //               lon: selectedPlace.x,
  //             })
  //           }
  //         >
  //           <Save></Save>
  //         </Fab>
  //       )}
  //     </Box>
  //   </Dialog>
  // );
};

export default SearchPlacesDialog;
