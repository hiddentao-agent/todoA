import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { OfflineBanner } from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
  it('renders offline message', async () => {
    const { container } = render(<OfflineBanner onDismiss={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/You.*re offline/)).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss offline notice')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(<OfflineBanner onDismiss={onDismiss} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByLabelText('Dismiss offline notice'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Escape key is pressed on the button', async () => {
    const onDismiss = vi.fn();
    const { container } = render(<OfflineBanner onDismiss={onDismiss} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const dismissButton = screen.getByLabelText('Dismiss offline notice');
    fireEvent.keyDown(dismissButton, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
