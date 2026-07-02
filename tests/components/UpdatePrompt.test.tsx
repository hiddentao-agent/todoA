import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { UpdatePrompt } from '@/components/UpdatePrompt';

describe('UpdatePrompt', () => {
  it('renders update message and buttons', async () => {
    const { container } = render(<UpdatePrompt onRefresh={vi.fn()} onDismiss={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('A new version is available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onRefresh when Refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    const { container } = render(<UpdatePrompt onRefresh={onRefresh} onDismiss={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(<UpdatePrompt onRefresh={vi.fn()} onDismiss={onDismiss} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
