import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PageView } from '../PageView';
import type { MediaEntry } from '@/shared/types';

// Mock child components
vi.mock('../ImageView', () => ({
  ImageView: ({ media }: { media: MediaEntry }) => (
    <div data-testid="image-view">{media.filename}</div>
  ),
}));

vi.mock('../AnimatedImageView', () => ({
  AnimatedImageView: ({ media }: { media: MediaEntry }) => (
    <div data-testid="animated-image-view">{media.filename}</div>
  ),
}));

vi.mock('../VideoPlayer', () => ({
  VideoPlayer: ({ media }: { media: MediaEntry }) => (
    <div data-testid="video-player">{media.filename}</div>
  ),
}));

function makeEntry(overrides: Partial<MediaEntry> = {}): MediaEntry {
  return {
    id: 1,
    galleryId: 1,
    filename: 'test.jpg',
    path: '/test.jpg',
    relativePath: 'test.jpg',
    sortOrder: 0,
    groupName: '',
    mediaType: 'image',
    width: null,
    height: null,
    fileSize: 1000,
    durationMs: null,
    isAnimated: false,
    mtime: 0,
    ...overrides,
  };
}

describe('PageView', () => {
  it('renders ImageView for static images', () => {
    render(<PageView media={makeEntry({ mediaType: 'image' })} />);
    expect(screen.getByTestId('image-view')).toBeInTheDocument();
  });

  it('renders ImageView for avif_static', () => {
    render(<PageView media={makeEntry({ mediaType: 'avif_static' })} />);
    expect(screen.getByTestId('image-view')).toBeInTheDocument();
  });

  it('renders AnimatedImageView for animated_image (GIF)', () => {
    render(<PageView media={makeEntry({ mediaType: 'animated_image' })} />);
    expect(screen.getByTestId('animated-image-view')).toBeInTheDocument();
  });

  it('renders AnimatedImageView for avif_animated', () => {
    render(<PageView media={makeEntry({ mediaType: 'avif_animated' })} />);
    expect(screen.getByTestId('animated-image-view')).toBeInTheDocument();
  });

  it('renders VideoPlayer for video', () => {
    render(<PageView media={makeEntry({ mediaType: 'video' })} />);
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });
});
