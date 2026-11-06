export type GrantCategory = 'events' | 'drinks' | 'games' | 'challenges' | 'groups' | 'items' | 'admin';

/** Permissions are named `<area>.<action>`; the area decides which section they are listed in. */
export const grantCategory = (key: string): GrantCategory => {
  const area = key.split('.')[0];
  switch (area) {
    case 'event':
      return 'events';
    case 'drinks':
      return 'drinks';
    case 'games':
      return 'games';
    case 'challenge':
    case 'challenges':
      return 'challenges';
    case 'groups':
      return 'groups';
    case 'items':
      return 'items';
    default:
      return 'admin';
  }
};

export const GRANT_CATEGORY_ORDER: GrantCategory[] = ['events', 'drinks', 'games', 'challenges', 'groups', 'items', 'admin'];
