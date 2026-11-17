import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { updateServiceWorker, sw } = vi.hoisted(() => ({
  updateServiceWorker: vi.fn(() => Promise.resolve()),
  sw: { needRefresh: true },
}));
vi.mock('virtual:pwa-register/react', () => ({
  // needRefresh: a new version is installed, the update page shows the "Jetzt aktualisieren" button.
  useRegisterSW: () => ({ needRefresh: [sw.needRefresh, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/features/auth/AuthGate', () => ({ AuthGate: () => null }));

import { ServiceWorkerGate } from '@/App';
import { SidebarUpdateDownload } from '@/features/pwa/AppUpdate';

const reload = vi.fn();
const controllerChange = new EventTarget();
let waiting: object | null;

beforeEach(() => {
  sw.needRefresh = true;
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

  it('keeps the app usable while a new version downloads and shows the progress in the sidebar', () => {
    sw.needRefresh = false;
    render(
      <ServiceWorkerGate>
        <p>App</p>
        <SidebarUpdateDownload />
      </ServiceWorkerGate>
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    act(() => {
      controllerChange.dispatchEvent(new MessageEvent('message', { data: { type: 'PRECACHE_PROGRESS', done: 1, total: 4 } }));
    });

    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });
});
