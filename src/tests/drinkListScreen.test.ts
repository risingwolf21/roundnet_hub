import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/queryClient', () => ({ queryClient: {} }));

import { EMPTY_DRINK } from '@/features/drinks/DrinkListScreen';

describe('DrinkListScreen EMPTY_DRINK', () => {
  test('uses an empty uuid string id (drink ids are uuids, not numbers)', () => {
    expect(EMPTY_DRINK.id).toBe('');
    expect(typeof EMPTY_DRINK.id).toBe('string');
  });

  test('has no legacy previousDrink field', () => {
    expect(EMPTY_DRINK).not.toHaveProperty('previousDrink');
  });

  test('is an inactive, empty drink template', () => {
    expect(EMPTY_DRINK).toEqual({
      imageUrl: '',
      name: '',
      price: 0,
      active: false,
      deleted: false,
      id: '',
      stock: 0,
      type: 'Drink',
    });
  });
});
