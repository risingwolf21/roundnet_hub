import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, test } from 'vitest';
import '../translation/i18n';

import LegalPage from '@/features/legal/LegalPage';
import { LEGAL } from '@/tenant/config';

const renderDoc = (doc: 'imprint' | 'privacy' | 'terms' | 'deleteAccount') =>
  render(<MemoryRouter><LegalPage doc={doc} /></MemoryRouter>);

describe('legal pages', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('de');
  });

  test('imprint shows the provider address', () => {
    renderDoc('imprint');
    expect(screen.getByRole('heading', { level: 1, name: 'Impressum' })).toBeTruthy();
    expect(screen.getByText(LEGAL.street, { exact: false })).toBeTruthy();
    expect(screen.getByText(LEGAL.city, { exact: false })).toBeTruthy();
  });

  test('email is only shown once configured', () => {
    renderDoc('imprint');
    expect(screen.queryByText(/E-Mail:/)).toBeNull();
  });

  test('privacy policy lists all sections without unresolved placeholders', () => {
    const { container } = renderDoc('privacy');
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(10);
    expect(container.textContent).not.toContain('{{');
  });

  test('delete-account page names the app', () => {
    const { container } = renderDoc('deleteAccount');
    expect(container.textContent).not.toContain('{{');
    expect(container.textContent).toContain('Konto löschen');
  });

  test('terms promise reporting, blocking and removal of objectionable content', () => {
    const { container } = renderDoc('terms');
    expect(container.textContent).not.toContain('{{');
    expect(container.textContent).toContain('Melden');
    expect(container.textContent).toContain('Blockieren');
    expect(container.textContent).toContain('24 Stunden');
  });

  test('English is available', async () => {
    await i18n.changeLanguage('en');
    renderDoc('privacy');
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeTruthy();
    await i18n.changeLanguage('de');
  });
});
