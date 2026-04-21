import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { SearchResult } from 'leaflet-geosearch/dist/providers/provider.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PlaceType } from '../types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { DialogProps } from '@/contexts/DialogsProvider';
import { X } from 'lucide-react';
import { toast } from 'sonner';

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
      // flyTo macht eine schöne weiche Kamerafahrt zur neuen Position
      map.flyTo([target.lat, target.lng], 16);
    }
  }, [target, map]);

  return null;
}

const SearchPlacesDialog = ({ open, onClose }: DialogProps<PlaceType, PlaceType | null>) => {

  const [value, setValue] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>();
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(defaultLocation);
  const [selectedPlace, setSelectedPlace] = useState<MySearchResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      // Check if navigator.permissions.query is supported and working
      // iOS Safari has inconsistent support for this API
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          navigator.permissions
            .query({ name: 'geolocation' } as PermissionDescriptor)
            .then((permissionStatus) => {
              if (permissionStatus.state === 'denied') {
                // Only redirect to app settings if we're in a native app context
                if (window.location.href.startsWith('app-settings:')) {
                  window.location.href = 'app-settings:location';
                }
              } else {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });
                  },
                  (error) => {
                    toast.error(`Error getting user location: \n ${error.message}`);
                  }
                );
              }
            })
            .catch(() => {
              // If permissions query fails (iOS Safari), just try to get location directly
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  setUserLocation({ latitude, longitude });
                },
                (error) => {
                  toast.error(`Error getting user location: \n ${error.message}`);
                }
              );
            });
        } catch (error) {
          // If permissions API throws synchronously (some iOS Safari versions), fallback to direct geolocation
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation({ latitude, longitude });
            },
            (error) => {
              toast.error(`Error getting user location: \n ${error.message}`);
            }
          );
        }
      } else {
        // Permissions API not supported, directly request location
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
          },
          (error) => {
            toast.error(`Error getting user location: \n ${error.message}`);
          }
        );
      }
    } else {
      toast.error(`Geolocation is not supported by this browser.`);
    }
  }, []);

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
      })
      .finally(() => setLoading(false));
  };

  const keyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  const setPlaceFromSearchResult = (res: any) => {

    const street =
      res.raw.address?.road && res.raw.address?.house_number ? `${res.raw.address.road} ${res.raw.address.house_number}` : null;

    const address =
      res.raw.address?.road && res.raw.address?.city && res.raw.address?.house_number && res.raw.address?.postcode
        ? `${street}, ${res.raw.address?.postcode} ${res.raw.address?.city}`
        : '';
    const name = res.raw.name ?? street ?? address ?? 'Unbenannter Ort';

    setSelectedPlace({
      x: res.x,
      y: res.y,
      name: name,
      description: address || null,
    });
  };

  const setPlaceFromLatLon = (lat: number, lon: number) => {
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=de`
    )
      .then((res) => res.json())
      .then((res) => {
        const street =
          res.address.road && res.address.house_number ? `${res.address.road} ${res.address.house_number}` : null;

        const address =
          res.address.road && res.address.city && res.address.house_number && res.address.postcode
            ? `${street}, ${res.address.postcode} ${res.address.city}`
            : '';
        const name = res.name ?? street ?? address ?? 'Unbenannter Ort';

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
              showCloseButton={false}
              onFocus={(e) => {
                e.preventDefault();
                inputRef.current?.focus();
              }}>
              <SheetHeader>
                <div className="flex items-center justify-between w-full gap-2">
                  <Input
                    ref={inputRef}
                    type="search"
                    value={value}
                    placeholder='Suche einen Ort...'

                    onChange={(e: { target: { value: React.SetStateAction<string> } }) => setValue(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => keyPress(e)}
                    className="w-full flex-1 bg-muted/50 text-foreground focus-visible:bg-background focus"
                  />
                  <SheetClose render={<Button variant={"ghost"}><X /></Button>} />
                </div>
              </SheetHeader>
              <div className='p-2 flex flex-col gap-2'>
                {
                  (results ?? []).map(x => (
                    <Item key={x.x + '-' + x.y} variant={"outline"} onClick={() => {
                      setPlaceFromSearchResult(x);
                      setSheetOpen(false);
                    }}>
                      <ItemContent>
                        <ItemTitle>{x.label}</ItemTitle>
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
          center={userLocation ? [userLocation?.latitude, userLocation?.longitude] : undefined}
          zoom={16}
        >
          <MyComponent />

          <MapFlyTo
            target={selectedPlace ? { lat: selectedPlace.y, lng: selectedPlace.x } : null}
          />

          {selectedPlace && <Marker position={[selectedPlace.y, selectedPlace.x]} />}

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </DialogBody>
      <DialogFooter variant={"fullscreen"} className='flex flex-col'>
        <div>
          <h3 className='text-lg font-semibold'>{selectedPlace ? selectedPlace.name : 'Kein Ort ausgewählt'}</h3>
          <p className='text-sm text-muted-foreground'>{selectedPlace?.description}</p>
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
