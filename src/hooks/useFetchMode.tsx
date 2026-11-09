import useLocalStorageState from 'use-local-storage-state';

const isValidFetchMode = (value: unknown): value is 'past' | 'upcoming' => value === 'past' || value === 'upcoming';

export function useFetchMode(): ['past' | 'upcoming', (newMode: 'past' | 'upcoming') => void] {
  const [mode, setMode] = useLocalStorageState<'past' | 'upcoming'>('fetchMode', {
    serializer: {
      parse: (value) => {
        if (isValidFetchMode(value)) return value;
        return 'upcoming';
      },
      stringify: (value) => value as string,
    }
  });

  // Fallback falls trotzdem `null` zurückkommt
  const safeMode: 'past' | 'upcoming' = isValidFetchMode(mode) ? mode : 'upcoming';

  return [safeMode, setMode];
}
