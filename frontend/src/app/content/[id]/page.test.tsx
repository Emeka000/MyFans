/* eslint-disable @next/next/no-img-element */
import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ClientContent } from '@/app/content/[id]/client-content';
import { ToastProvider } from '@/contexts/ToastContext';
import type { ContentMetadata } from '@/lib/api/content';

vi.mock('next/image', () => ({
  default: (props: ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) => {
    const sanitizedProps = { ...props };
    delete sanitizedProps.fill;
    delete sanitizedProps.priority;
    return <img {...sanitizedProps} alt={props.alt ?? ''} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockStatus = vi.fn();
vi.mock('@/hooks/useViewerSubscriptionStatus', () => ({
  useViewerSubscriptionStatus: () => mockStatus(),
}));

const content: ContentMetadata = {
  id: '1',
  title: 'Behind the scenes',
  description: 'Exclusive footage.',
  contentUrl: 'https://cdn.example.com/videos/1.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumbs/1.jpg',
  type: 'video',
  isGated: true,
  creator: { id: 'creator-1', name: 'Jamie Rivera', username: 'jamierivera', isVerified: true },
  metadata: {
    publishedAt: '2026-01-01T00:00:00.000Z',
    viewCount: 1000,
    likeCount: 50,
    commentCount: 5,
    tags: ['exclusive'],
  },
};

function renderContent() {
  return render(
    <ToastProvider>
      <ClientContent content={content} />
    </ToastProvider>,
  );
}

describe('ClientContent subscription state', () => {
  beforeEach(() => {
    mockStatus.mockReset();
  });

  it('shows a subscribe CTA and no badge when the viewer is not subscribed', () => {
    mockStatus.mockReturnValue({ status: null, isLoading: false, error: null });

    renderContent();

    expect(screen.getByRole('link', { name: 'Subscribe' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /Subscription status/ })).not.toBeInTheDocument();
  });

  it('shows the active badge and no subscribe CTA when the viewer is subscribed', () => {
    mockStatus.mockReturnValue({ status: 'active', isLoading: false, error: null });

    renderContent();

    expect(
      screen.getAllByRole('status', { name: 'Subscription status: active' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Subscribe/ })).not.toBeInTheDocument();
  });

  it('shows a loading placeholder while the status is resolving', () => {
    mockStatus.mockReturnValue({ status: null, isLoading: true, error: null });

    renderContent();

    expect(screen.getByRole('status', { name: 'Checking subscription status' })).toBeInTheDocument();
  });
});
