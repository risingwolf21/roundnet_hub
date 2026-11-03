import { UpdateReadyPage, UpdateSuccess } from '@/features/pwa/AppUpdate';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FLAG = 'pwa-update-applied';

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe('UpdateReadyPage', () => {
  it('asks the user to refresh and does nothing until they tap', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<UpdateReadyPage onRefresh={onRefresh} />);

    expect(screen.getByRole('alertdialog', { name: 'Neue Version bereit' })).toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(FLAG)).toBeNull();
  });

  it('refreshes once on tap, disables the button and remembers it for the success animation', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<UpdateReadyPage onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jetzt aktualisieren' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Aktualisiere/ })).toBeDisabled();
    expect(sessionStorage.getItem(FLAG)).toBe('1');
  });

  it('lets the user try again when the update fails, without a success flag', async () => {
    const onRefresh = vi.fn().mockRejectedValue(new Error('no service worker'));
    render(<UpdateReadyPage onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jetzt aktualisieren' }));

    expect(screen.getByRole('button', { name: 'Jetzt aktualisieren' })).toBeEnabled();
    expect(sessionStorage.getItem(FLAG)).toBeNull();
  });
});

describe('UpdateSuccess', () => {
  it('shows nothing on an ordinary page load', () => {
    render(<UpdateSuccess />);
    expect(screen.queryByText('App aktualisiert')).not.toBeInTheDocument();
  });

  it('shows once after an update, then disappears on its own', () => {
    vi.useFakeTimers();
    sessionStorage.setItem(FLAG, '1');
    render(<UpdateSuccess />);

    expect(screen.getByText('App aktualisiert')).toBeInTheDocument();
    expect(sessionStorage.getItem(FLAG)).toBeNull(); // a later reload must not show it again

    act(() => vi.advanceTimersByTime(3300));
    expect(screen.queryByText('App aktualisiert')).not.toBeInTheDocument();
  });

  it('can be dismissed right away by tapping it', async () => {
    sessionStorage.setItem(FLAG, '1');
    render(<UpdateSuccess />);

    await userEvent.click(screen.getByRole('button', { name: /App aktualisiert/ }));

    expect(screen.queryByText('App aktualisiert')).not.toBeInTheDocument();
  });
});
