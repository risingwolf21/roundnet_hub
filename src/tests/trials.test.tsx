import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signIn, redeem, inviteInfo, application } = vi.hoisted(() => ({
  signIn: vi.fn(),
  redeem: vi.fn(),
  inviteInfo: { data: null as unknown, isLoading: false },
  application: { user: null as unknown },
}));

vi.mock('@/tanstack/trials', () => ({
  useTrialInviteInfo: () => inviteInfo,
  useSignInAsGuest: () => ({ mutate: signIn, isPending: false, isError: false }),
  useRedeemTrialInvite: () => ({ mutate: redeem, isPending: false, isError: false }),
}));
vi.mock('@/features/auth/ApplicationContext', () => ({ useApplication: () => application }));

import { trialAttendanceError } from '@/features/trials/trialErrors';
import TrialInvitePage from '@/features/trials/TrialInvitePage';

const VALID = { group_id: 'g-1', group_name: 'Basic Training', event_limit: 3, expires_at: null, valid: true };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/probe/tok-1']}>
      <Routes>
        <Route path="/probe/:token" element={<TrialInvitePage />} />
        <Route path="/home" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  signIn.mockReset();
  redeem.mockReset();
  sessionStorage.clear();
  inviteInfo.data = VALID;
  application.user = null;
});

describe('trialAttendanceError', () => {
  it('explains the refusals of a trial sign-up and ignores other errors', () => {
    expect(trialAttendanceError({ hint: 'trial_event_limit_reached' })).toMatch(/aufgebraucht/);
    expect(trialAttendanceError({ hint: 'trial_event_closed' })).toMatch(/nicht für Probetraining offen/);
    expect(trialAttendanceError({ hint: 'something else' })).toBeNull();
    expect(trialAttendanceError(new Error('boom'))).toBeNull();
  });
});

describe('TrialInvitePage', () => {
  it('shows the group and the number of trainings of a valid link', () => {
    renderPage();
    expect(screen.getByText('Du wurdest zur Gruppe Basic Training eingeladen.')).toBeInTheDocument();
    expect(screen.getByText('3 Probetrainings')).toBeInTheDocument();
  });

  it('explains an invalid link instead of offering to start', () => {
    inviteInfo.data = { ...VALID, valid: false };
    renderPage();
    expect(screen.getByText('Dieser Link funktioniert nicht mehr')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Probetraining starten' })).not.toBeInTheDocument();
  });

  it('asks for a name before signing in as a guest', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Probetraining starten' }));
    expect(screen.getByText('Bitte gib deinen Namen ein.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in as a guest with the typed name and remembers it for joining', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Wie heißt du?'), '  Lena ');
    await userEvent.click(screen.getByRole('button', { name: 'Probetraining starten' }));
    expect(signIn).toHaveBeenCalledWith({ name: 'Lena', language: expect.any(String) }, expect.anything());
    expect(JSON.parse(sessionStorage.getItem('trial-invite-pending')!)).toEqual({ token: 'tok-1', name: 'Lena' });
  });

  it('joins the group once the guest is signed in', () => {
    sessionStorage.setItem('trial-invite-pending', JSON.stringify({ token: 'tok-1', name: 'Lena' }));
    application.user = { id: 'u-1', displayName: 'Lena', groups: [] };
    renderPage();
    expect(redeem).toHaveBeenCalledWith({ token: 'tok-1', name: 'Lena' }, expect.anything());
  });

  it('lets a signed-in member join with their account', async () => {
    application.user = { id: 'u-2', displayName: 'Jonas', groups: [] };
    renderPage();
    expect(redeem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Probetraining starten' }));
    expect(redeem).toHaveBeenCalledWith({ token: 'tok-1', name: undefined }, expect.anything());
  });

  it('sends people who are already in the group to the app', () => {
    application.user = { id: 'u-3', displayName: 'Mia', groups: [{ id: 'g-1', user_role: 'user' }] };
    renderPage();
    expect(screen.getByRole('button', { name: 'Du bist schon dabei – zur App' })).toBeInTheDocument();
  });
});
