import { ChallengePodium } from '@/features/challenges/ChallengeLeaderboard';
import { ChallengePointsView } from '@/types/supabaseTypes';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const entry = (user: string, total_points: number): ChallengePointsView => ({
  user,
  displayName: user,
  avatarUrl: null,
  challenge: 'c1',
  total_points,
});

describe('ChallengePodium', () => {
  it('shows places as 2nd · 1st · 3rd, and tied players share a place', () => {
    render(<ChallengePodium challenge_points={[entry('Cleo', 5), entry('Anna', 12), entry('Ben', 8), entry('Bea', 8), entry('Dan', 1)]} />);

    const places = within(screen.getByRole('list', { name: 'Siegertreppchen' })).getAllByRole('listitem');
    expect(places.map((p) => p.textContent)).toEqual([
      expect.stringContaining('Ben, Bea'),
      expect.stringContaining('Anna'),
      expect.stringContaining('Cleo'),
    ]);
    expect(places[1]).toHaveTextContent('12 Punkte');
    expect(screen.queryByText('Dan')).not.toBeInTheDocument();
  });

  it('leaves out places nobody reached', () => {
    render(<ChallengePodium challenge_points={[entry('Anna', 1)]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('1 Punkt')).toBeInTheDocument();
  });

  it('renders nothing without points', () => {
    const { container } = render(<ChallengePodium challenge_points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
