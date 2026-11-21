import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { signInWithPassword, captureException } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithPassword, setSession: vi.fn() } } }));
vi.mock('@sentry/react', () => ({ captureException }));
vi.mock('@/features/auth/ApplicationContext', () => ({ useApplication: () => ({ version: undefined }) }));

import LoginForm from '@/features/auth/LoginForm';

const submit = () => {
  render(<MemoryRouter><LoginForm /></MemoryRouter>);
  fireEvent.change(document.getElementById('email')!, { target: { value: 'max@example.com' } });
  fireEvent.change(document.getElementById('password')!, { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
};

const failWith = (error: { code?: string; status: number; message: string }) =>
  signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error });

beforeEach(() => {
  signInWithPassword.mockReset();
  captureException.mockReset();
});

describe('LoginForm', () => {
  test('a network failure (Safari "Load failed") shows the error but is not reported to Sentry', async () => {
    failWith({ status: 0, message: 'Load failed (example.supabase.co)' });
    submit();

    expect(await screen.findByText(/Login fehlgeschlagen/)).toBeInTheDocument();
    expect(captureException).not.toHaveBeenCalled();
  });

  test('an unexpected auth error is still reported to Sentry', async () => {
    failWith({ code: 'unexpected_failure', status: 500, message: 'Database error' });
    submit();

    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(1));
  });
});
