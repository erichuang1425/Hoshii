import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders nothing when value is 0', () => {
    const { container } = render(<ProgressBar value={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders progress bar with correct width', () => {
    render(<ProgressBar value={0.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  it('clamps value above 1 to 100%', () => {
    render(<ProgressBar value={1.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders at full width when value is 1', () => {
    render(<ProgressBar value={1} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
