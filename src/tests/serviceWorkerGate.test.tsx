import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { updateServiceWorker } = vi.hoisted(() => ({ updateServiceWorker: vi.fn(() => Promise.resolve()) }));
vi.mock('virtual:pwa-register/react', () => ({
  // A new version is installed: the update page shows the "Jetzt aktualisieren" button.
  useRegisterSW: () => ({ needRefresh: [true, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/features/auth/AuthGate', () => ({ AuthGate: () => null }));

import { ServiceWorkerGate } from '@/App';

const reload = vi.fn();
const controllerChange = new EventTarget();
let waiting: object | null;

beforeEach(() => {
  updateServiceWorker.mockClear();
  reload.mockClear();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: {},
      getRegistration: () => Promise.resolve({ waiting }),
      addEventListener: controllerChange.addEventListener.bind(controllerChange),
      removeEventListener: controllerChange.removeEventListener.bind(controllerChange),
    },
  });
});
afterEach(() => vi.restoreAllMocks());

const tapUpdate = () => userEvent.click(screen.getByRole('button', { name: 'Jetzt aktualisieren' }));

describe('ServiceWorkerGate', () => {
  it('reloads when the button is tapped and no new version is waiting anymore', async () => {
    waiting = null; // already activated, but the page was not reloaded
    render(<ServiceWorkerGate />);

    await tapUpdate();

    expect(reload).toHaveBeenCalled();
  });

  it('activates the waiting version when the button is tapped', async () => {
    waiting = {};
    render(<ServiceWorkerGate />);
    updateServiceWorker.mockClear(); // the automatic activation on mount

    await tapUpdate();

    expect(updateServiceWorker).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once the new version controls the page', () => {
    waiting = {};
    render(<ServiceWorkerGate />);

    act(() => {
      controllerChange.dispatchEvent(new Event('controllerchange'));
    });

    expect(reload).toHaveBeenCalled();
  });
});
