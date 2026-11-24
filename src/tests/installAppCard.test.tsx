import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

import { InstallAppCard } from '@/features/pwa/InstallAppCard';

const offerInstall = () => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  act(() => {
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt }));
  });
  return prompt;
};

beforeEach(() => localStorage.clear());

describe('InstallAppCard', () => {
  test('stays hidden while the browser offers no install', () => {
    render(<InstallAppCard />);
    expect(screen.queryByText('App installieren')).toBeNull();
  });

  test('opens the browser install dialog once and then hides', () => {
    render(<InstallAppCard />);
    const prompt = offerInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Installieren' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByText('App installieren')).toBeNull();
  });

  test('stays hidden after it was dismissed', () => {
    const { unmount } = render(<InstallAppCard />);
    offerInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis ausblenden' }));
    expect(screen.queryByText('App installieren')).toBeNull();
    unmount();
    render(<InstallAppCard />);
    expect(screen.queryByText('App installieren')).toBeNull();
  });
});
