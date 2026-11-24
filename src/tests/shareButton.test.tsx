import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

import { ShareButton } from '@/components/ShareButton';

beforeEach(() => {
  toastSuccess.mockClear();
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});

describe('ShareButton', () => {
  it('opens the share sheet with the page link', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    render(<ShareButton title="Training" text="Training · Di., 24. Nov., 18:00" />);

    await userEvent.click(screen.getByRole('button'));

    expect(share).toHaveBeenCalledWith({ title: 'Training', text: 'Training · Di., 24. Nov., 18:00', url: window.location.href });
  });

  it('copies the link where there is no share sheet', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<ShareButton title="Training" />);

    await user.click(screen.getByRole('button'));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(toastSuccess).toHaveBeenCalled();
  });
});
