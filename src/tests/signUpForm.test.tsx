import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { signUp, navigate } = vi.hoisted(() => ({ signUp: vi.fn(), navigate: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signUp, setSession: vi.fn() } } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('@/features/auth/ApplicationContext', () => ({ useApplication: () => ({ version: undefined }) }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

import SignUpForm from '@/features/auth/SignUpForm';

const fillAndSubmit = () => {
  fireEvent.change(document.getElementById('email')!, { target: { value: 'max@example.com' } });
  fireEvent.change(document.getElementById('name')!, { target: { value: 'Max' } });
  fireEvent.change(document.getElementById('surname')!, { target: { value: 'Muster' } });
  fireEvent.change(document.getElementById('password')!, { target: { value: 'secret123' } });
  fireEvent.change(document.getElementById('repeat-password')!, { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }));
};

const renderForm = () => render(<MemoryRouter><SignUpForm /></MemoryRouter>);

beforeEach(() => {
  signUp.mockReset();
  navigate.mockReset();
});

describe('SignUpForm', () => {
  test('an existing e-mail (user without identities) shows a hint and stays on the page', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'x', identities: [] }, session: null }, error: null });
    renderForm();
    fillAndSubmit();

    expect(await screen.findByText('Diese E-Mail ist bereits registriert')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a failed sign-up keeps the error visible instead of navigating away', async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'over_email_send_rate_limit', message: 'rate limit' } });
    renderForm();
    fillAndSubmit();

    expect(await screen.findByText(/Registrierung fehlgeschlagen/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a new account still goes on to the login', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'x', identities: [{ id: 'i' }] }, session: null }, error: null });
    renderForm();
    fillAndSubmit();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth/login'));
    expect(screen.queryByText('Diese E-Mail ist bereits registriert')).not.toBeInTheDocument();
  });
});
