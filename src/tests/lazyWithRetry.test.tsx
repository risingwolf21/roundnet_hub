import { render, screen } from '@testing-library/react';
import { Component, PropsWithChildren, Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lazyWithRetry } from '@/hooks/lazyWithRetry';

const reload = vi.fn();

class Boundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>failed</p> : this.props.children;
  }
}

const renderBrokenChunk = () => {
  const Page = lazyWithRetry(() => Promise.reject(new Error('Failed to fetch dynamically imported module')), {
    retries: 0,
  });
  render(
    <Boundary>
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </Boundary>
  );
};

beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
});

describe('lazyWithRetry', () => {
  it('reloads once when a chunk cannot be loaded', async () => {
    renderBrokenChunk();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('shows the error instead of reloading again right after that reload', async () => {
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
    renderBrokenChunk();
    expect(await screen.findByText('failed')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
