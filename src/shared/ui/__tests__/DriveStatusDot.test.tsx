import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DriveStatusDot } from '../DriveStatusDot';

describe('DriveStatusDot', () => {
  it('shows green for online', () => {
    render(<DriveStatusDot online={true} />);
    const dot = screen.getByRole('status');
    expect(dot.className).toContain('bg-[var(--success)]');
    expect(dot).toHaveAttribute('aria-label', 'Online');
  });

  it('shows grey for offline', () => {
    render(<DriveStatusDot online={false} />);
    const dot = screen.getByRole('status');
    expect(dot.className).toContain('bg-[var(--offline)]');
    expect(dot).toHaveAttribute('aria-label', 'Offline');
  });
});
