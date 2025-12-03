import { useLocalStorageState } from '@toolpad/core';

const isValidFetchMode = (value: unknown): value is 'past' | 'upcoming' => value === 'past' || value === 'upcoming';

export function useFetchMode(): ['past' | 'upcoming', (newMode: 'past' | 'upcoming') => void] {
  const [mode, setMode] = useLocalStorageState<'past' | 'upcoming'>('fetchMode', 'upcoming', {
    codec: {
      parse: (value: unknown): 'past' | 'upcoming' => {
        return isValidFetchMode(value) ? value : 'upcoming';
      },
      stringify: (value) => value,
    },
  });

  // Fallback falls trotzdem `null` zurückkommt
  const safeMode: 'past' | 'upcoming' = isValidFetchMode(mode) ? mode : 'upcoming';

  return [safeMode, setMode];
}
