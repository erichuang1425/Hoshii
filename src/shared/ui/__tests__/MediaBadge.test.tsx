import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MediaBadge } from '../MediaBadge';

describe('MediaBadge', () => {
  it('renders VIDEO badge for video type', () => {
    render(<MediaBadge mediaType="video" />);
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
  });

  it('renders GIF badge for animated_image type', () => {
    render(<MediaBadge mediaType="animated_image" />);
    expect(screen.getByText('GIF')).toBeInTheDocument();
  });

  it('renders AVIF badge for avif_animated type', () => {
    render(<MediaBadge mediaType="avif_animated" />);
    expect(screen.getByText('AVIF')).toBeInTheDocument();
  });

  it('renders nothing for static image type', () => {
    const { container } = render(<MediaBadge mediaType="image" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for avif_static type', () => {
    const { container } = render(<MediaBadge mediaType="avif_static" />);
    expect(container.firstChild).toBeNull();
  });
});
