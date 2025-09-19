import { PlaceType } from '@/features/events/types';
import { useLocalStorageState } from '@toolpad/core';

export function useSearchedPlaces(): [PlaceType[], (places: PlaceType[]) => void] {
  const [places, setPlaces] = useLocalStorageState<PlaceType[]>('searchedPlacesCache', [], {
    codec: {
      parse: (value): PlaceType[] => {
        return JSON.parse(value) as PlaceType[];
      },
      stringify: (value) => JSON.stringify(value),
    },
  });

  return [places ?? [], setPlaces];
}
