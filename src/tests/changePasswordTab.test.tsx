import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { updateUser, captureException, toastError } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  captureException: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { updateUser } } }));
vi.mock('@sentry/react', () => ({ captureException }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import { ChangePasswordTab } from '@/features/profile/tabs/ChangePasswordTab';

const submit = () => {
  fireEvent.change(document.getElementById('password')!, { target: { value: 'secret123' } });
  fireEvent.change(document.getElementById('confirmPassword')!, { target: { value: 'secret123' } });
  fireEvent.submit(document.querySelector('form')!);
};

beforeEach(() => {
  updateUser.mockReset();
  captureException.mockReset();
  toastError.mockReset();
});

describe('ChangePasswordTab', () => {
  test('the same password as before shows a hint and is not reported (Sentry ROUNDNET-KARLSRUHE-203)', async () => {
    updateUser.mockResolvedValue({ error: { code: 'same_password', message: 'New password should be different from the old password.' } });
    render(<ChangePasswordTab />);
    submit();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Das neue Passwort muss sich vom aktuellen unterscheiden.'));
    expect(captureException).not.toHaveBeenCalled();
  });

  test('other errors are still reported', async () => {
    const error = { code: 'unexpected_failure', message: 'boom' };
    updateUser.mockResolvedValue({ error });
    render(<ChangePasswordTab />);
    submit();

    await waitFor(() => expect(captureException).toHaveBeenCalledWith(error));
    expect(toastError).toHaveBeenCalledWith('boom');
  });
});
