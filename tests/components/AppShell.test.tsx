import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { AppShell } from '@/components/AppShell';
import { mockNeedRefresh, mockUpdateServiceWorker } from 'virtual:pwa-register/preact';

let mockOnline = true;
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnline = true;
    mockNeedRefresh[0] = false;
  });

  it('renders children', () => {
    render(
      <AppShell>
        <p>Hello world</p>
      </AppShell>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows OfflineBanner when offline', async () => {
    mockOnline = false;
    const { container } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/You.*re offline/)).toBeInTheDocument();
  });

  it('does not show OfflineBanner when online', () => {
    mockOnline = true;
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides OfflineBanner when dismissed', async () => {
    mockOnline = false;
    const { container } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    fireEvent.click(screen.getByLabelText('Dismiss offline notice'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resets offline dismissed state when coming back online', async () => {
    // Start offline with banner visible
    mockOnline = false;
    const { container, rerender } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Dismiss the banner
    fireEvent.click(screen.getByLabelText('Dismiss offline notice'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Go back online — banner should not reappear (since we're online)
    mockOnline = true;
    rerender(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Go offline again — banner should show again (since dismissed was reset)
    mockOnline = false;
    rerender(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows UpdatePrompt when update is available', async () => {
    mockNeedRefresh[0] = true;
    const { container } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('A new version is available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('does not show UpdatePrompt when no update is available', () => {
    mockNeedRefresh[0] = false;
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
  });

  it('calls updateServiceWorker on Refresh click', () => {
    mockNeedRefresh[0] = true;
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismisses UpdatePrompt via dismissUpdate', () => {
    mockNeedRefresh[0] = true;
    const dismissUpdate = mockNeedRefresh[1] as ReturnType<typeof vi.fn>;
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismissUpdate).toHaveBeenCalled();
  });
});
