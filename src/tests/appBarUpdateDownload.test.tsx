import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

import { AppBar } from '@/components/ui/appbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { UpdateDownload, UpdateDownloadContext } from '@/features/pwa/updateDownload';

const renderAppBar = (download: UpdateDownload) =>
  render(
    <UpdateDownloadContext value={download}>
      <SidebarProvider>
        <AppBar title="Startseite" />
      </SidebarProvider>
    </UpdateDownloadContext>
  );

// The sidebar asks whether it runs on a phone; jsdom has no matchMedia.
beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

describe('AppBar while a new app version downloads', () => {
  it('shows the progress along its bottom edge (phones, where the sidebar is closed)', () => {
    renderAppBar(0.45);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
  });

  it('shows nothing when no download runs', () => {
    renderAppBar(undefined);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
