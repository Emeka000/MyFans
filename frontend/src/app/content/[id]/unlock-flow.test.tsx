/* eslint-disable @next/next/no-img-element */
import type { ComponentProps, ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContentPage from '@/app/content/[id]/page';
import { ToastProvider } from '@/contexts/ToastContext';
import type { ContentMetadata } from '@/lib/api/content';

/**
 * Integration tests for the content/[id] unlock flow.
 *
 * Unlike page.test.tsx (which exercises the subscription badge alone),
 * these tests mock the content API layer directly so we can assert on
 * the actual gated (locked overlay) vs unlocked (player) rendering that
 * GatedContentViewer produces once access has been checked.
 */

vi.mock('next/image', () => ({
  default: (props: ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) => {
    const sanitizedProps = { ...props };
    delete sanitizedProps.fill;
    delete sanitizedProps.priority;

    return <img {...sanitizedProps} alt={props.alt ?? ''} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/content', () => ({
  getContentById: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

const mockViewerStatus = vi.fn();
vi.mock('@/hooks/useViewerSubscriptionStatus', () => ({
  useViewerSubscriptionStatus: () => mockViewerStatus(),
}));

import { getContentById } from '@/lib/api/content';

const baseContent: ContentMetadata = {
  id: '1',
  title: 'Behind the scenes',
  description: 'Exclusive footage from the last shoot.',
  contentUrl: 'https://cdn.example.com/videos/1.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumbs/1.jpg',
  type: 'video',
  isGated: true,
  creator: {
    id: 'creator-1',
    name: 'Jamie Rivera',
    username: 'jamierivera',
    isVerified: true,
  },
  metadata: {
    publishedAt: '2026-01-01T00:00:00.000Z',
    viewCount: 1000,
    likeCount: 50,
    commentCount: 5,
    tags: ['exclusive'],
  },
};

function renderContentPage() {
  return render(
    <ToastProvider>
      <ContentPage params={Promise.resolve({ id: '1' })} />
    </ToastProvider>,
  );
}

describe('content/[id] unlock flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getContentById).mockReset();
    mockViewerStatus.mockReset();
    mockViewerStatus.mockReturnValue({ status: null, isLoading: false, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the locked overlay for gated content without an active subscription', async () => {
    vi.mocked(getContentById).mockResolvedValue({ ...baseContent, isGated: true });
    mockViewerStatus.mockReturnValue({ status: null, isLoading: false, error: null });

    await act(async () => {
      renderContentPage();
    });

    expect(await screen.findByText('Exclusive Content')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Subscribe to ${baseContent.creator.name}` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('renders the full player for unlocked (un-gated) content', async () => {
    vi.mocked(getContentById).mockResolvedValue({ ...baseContent, isGated: false });

    renderContentPage();

    await waitFor(() => {
      expect(screen.queryByText('Exclusive Content')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Verifying access...')).not.toBeInTheDocument();
  });

  it('renders the full player once a gated content check resolves to an active subscription', async () => {
    mockViewerStatus.mockReturnValue({ status: 'active', isLoading: false, error: null });
    vi.mocked(getContentById).mockResolvedValue({ ...baseContent, isGated: true });

    await act(async () => {
      renderContentPage();
    });

    await waitFor(() => {
      expect(screen.queryByText('Exclusive Content')).not.toBeInTheDocument();
    });
    expect(
      screen.getAllByRole('status', { name: 'Subscription status: active' }).length,
    ).toBeGreaterThan(0);
  });
});
