import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { SearchResult } from 'leaflet-geosearch/dist/providers/provider.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PlaceType } from '../types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useUserLocation } from '@/hooks/useUserLocation';
import L from 'leaflet';
import { RawResult } from 'leaflet-geosearch/dist/providers/openStreetMapProvider.js';
import { MapPin, X } from 'lucide-react';

import '@/styles/user-location.css';

type MySearchResult = Pick<SearchResult, 'x' | 'y'> & {
  name: string;
  description: string | null;
};

const locationMap = {
  'roundnet-karlsruhe': { latitude: 49.0069, longitude: 8.4037 },
  'munich-roundnet': { latitude: 48.1351, longitude: 11.582 },
};

const defaultLocation =
  locationMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof locationMap) || 'roundnet-karlsruhe'];

function MapFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 18, { duration: 0.5 });
    }
  }, [target, map]);

  return null;
}

const parseAddress = (raw: any) => {
  const addr = raw.address || raw;
  const street = addr.road && addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road || null;
  const cityInfo = addr.postcode && addr.city ? `${addr.postcode} ${addr.city}` : addr.city || '';

  const address = street && cityInfo ? `${street}, ${cityInfo}` : street || cityInfo || '';
  const name = raw.name || street || address || 'Unbenannter Ort';

  return { name, description: address || null };
};

const SearchPlacesDialog = ({ open, onClose }: DialogProps<PlaceType, PlaceType | null>) => {

  const [value, setValue] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [results, setResults] = useState<SearchResult<RawResult>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MySearchResult | null>(null);

  const userLocation = useUserLocation();

  const initialMapCenter = useMemo<L.LatLngExpression>(() => {
    if (userLocation) return [userLocation.latitude, userLocation.longitude];
    return [defaultLocation.latitude, defaultLocation.longitude];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provider = useMemo(() => new OpenStreetMapProvider({
    params: { addressdetails: 1, 'accept-language': 'de' }
  }), []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      const searchResults = await provider.search({ query });
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  }, [provider]);

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
      <DialogHeader variant={"appbar"}>
        <div className="flex flex-1 items-center justify-center lg:w-1/3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={
              <button
                className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground ring-offset-background cursor-text hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Suche einen Ort...
              </button>} />
            <SheetContent side="top" className={"gap-0 pt-safe-top"}
              showCloseButton={false}>
              <SheetHeader>
                <div className="flex items-center justify-between w-full gap-2">
                  <Input
                    autoFocus
                    type="search"
                    value={value}
                    placeholder='Suche einen Ort...'

                    onChange={(e: { target: { value: React.SetStateAction<string> } }) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(value)}
                    className="w-full flex-1 bg-muted/50 text-foreground focus-visible:bg-background focus"
                  />
                  <SheetClose render={<Button variant={"ghost"}><X /></Button>} />
                </div>
              </SheetHeader>
              <div className='p-2 flex flex-col gap-2'>
                {
                  results.map((res) => (
                    <Item
                      key={`${res.x}-${res.y}`}
                      onClick={() => {
                        const { name, description } = parseAddress(res.raw);
                        setSelectedPlace({ x: res.x, y: res.y, name, description });
                        setSheetOpen(false);
                      }}
                    >
                      <ItemContent>
                        <ItemTitle>{res.label}</ItemTitle>
                      </ItemContent>
                    </Item>
                  ))
                }
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </DialogHeader>
      <DialogBody className='p-0'>
        <MapContainer
          className='size-full'
          center={initialMapCenter}
          zoom={16}
        >

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapEvents />

          <MapFlyTo target={selectedPlace ? { lat: selectedPlace.y, lng: selectedPlace.x } : null} />

          {selectedPlace && <Marker position={[selectedPlace.y, selectedPlace.x]} />}

          {
            userLocation && (
              <Marker
                position={[userLocation.latitude, userLocation.longitude]}
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

        </MapContainer>

        {
          userLocation && <Button
            className="absolute bottom-42 right-4 z-[1000] rounded-full size-12"
            variant="default"
            onClick={() => setSelectedPlace({
              x: userLocation.longitude,
              y: userLocation.latitude,
              name: 'Mein Standort',
              description: 'Aktuelle GPS-Position'
            })}
          >
            <MapPin />
          </Button>

        }
      </DialogBody>
      <DialogFooter variant={"fullscreen"} className='flex flex-col w-full max-w-lg mx-auto p-4'>
        <div className='w-full max-w-lg'>
          <div>
            {
              selectedPlace ? (
                <div className='flex flex-col gap-2'>
                  <Input
                    placeholder='Name'
                    value={selectedPlace.name}
                    onChange={(e) => setSelectedPlace({ ...selectedPlace, name: e.target.value })}
                    className='text-base font-semibold'
                  />

                  <Input
                    placeholder='Beschreibung'
                    value={selectedPlace.description ?? ''}
                    onChange={(e) => setSelectedPlace({ ...selectedPlace, description: e.target.value })}
                    className='text-base text-muted-foreground'
                  />
                </div>
              ) : (
                <p className='text-center text-muted-foreground'>Klicke auf die Karte, um einen Ort auszuwählen.</p>
              )
            }
          </div>
          <div className='flex flex-row gap-2 w-full mt-4'>
            <Button variant={"outline"} className={"flex-1"} onClick={() => onClose(null)}>
              Abbrechen
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
                Speichern
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
