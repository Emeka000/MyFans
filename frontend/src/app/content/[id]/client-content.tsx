'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GatedContentViewer } from '@/components/GatedContentViewer';
import { SubscriptionStatusBadge } from '@/components/subscription/SubscriptionStatusBadge';
import {
  getSubscriptionStatusCopy,
  isSubscriptionActive,
} from '@/lib/subscription-status';
import { getWalletSession } from '@/lib/client-session';
import { useViewerSubscriptionStatus } from '@/hooks/useViewerSubscriptionStatus';
import type { ContentMetadata } from '@/lib/api/content';

interface ClientContentProps {
  content: ContentMetadata;
}

export function ClientContent({ content }: ClientContentProps) {
  const router = useRouter();
  const creatorKey = content.creator.username || content.creator.id;
  const { status: subscriptionStatus, isLoading } = useViewerSubscriptionStatus(creatorKey);

  const [hasWalletSession] = React.useState(
    () => typeof window !== 'undefined' && !!getWalletSession(),
  );

  const isSubscribed = isSubscriptionActive(subscriptionStatus);
  const subscriptionCopy = subscriptionStatus
    ? getSubscriptionStatusCopy(subscriptionStatus)
    : null;

  const subscribeHref = `/subscribe?creator=${encodeURIComponent(
    content.creator.username || content.creator.id,
  )}`;

  const handleLike = async (liked: boolean): Promise<void> => {
    void liked;
  };

  const handleShare = () => {};

  const handleSubscribe = () => {
    router.push(hasWalletSession ? subscribeHref : '/subscribe');
  };

  // Access is driven by the live status from the backend/chain, not a stub.
  const handleCheckAccess = async (): Promise<boolean> => isSubscribed;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3 mb-8">
        {isLoading ? (
          <span
            className="h-7 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
            aria-label="Checking subscription status"
            role="status"
          />
        ) : (
          <>
            {subscriptionStatus && <SubscriptionStatusBadge status={subscriptionStatus} />}
            {!isSubscribed && (
              <Link
                href={hasWalletSession ? subscribeHref : '/subscribe'}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {subscriptionCopy?.ctaLabel ?? 'Subscribe'}
              </Link>
            )}
          </>
        )}
      </div>
      <GatedContentViewer
        contentId={content.id}
        title={content.title}
        type={content.type as 'video' | 'image' | 'audio' | 'text'}
        contentUrl={content.contentUrl}
        thumbnailUrl={content.thumbnailUrl}
        description={content.description}
        isSubscribed={isSubscribed}
        subscriptionStatus={subscriptionStatus}
        isLoading={isLoading}
        isGated={content.isGated}
        creator={content.creator}
        metadata={
          content.metadata as React.ComponentProps<typeof GatedContentViewer>['metadata']
        }
        relatedContent={content.relatedContent}
        onCheckAccess={handleCheckAccess}
        onSubscribe={handleSubscribe}
        onLike={handleLike}
        onShare={handleShare}
      />
    </div>
  );
}
