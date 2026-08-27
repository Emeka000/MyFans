'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionStatus } from '@/lib/subscription-status';
import { useWallet } from '@/hooks/useWallet';

export interface UseViewerSubscriptionStatusResult {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Live subscription status of the current viewer for a creator.
 *
 * - Logged out / no wallet → `null` (visitor view, gated content stays locked).
 * - Wallet present → asks the backend (`/subscriptions/me/subscription-state`,
 *   which resolves against the index / chain), falling back to the
 *   `me/list` endpoint.
 *
 * There is no local "is this user subscribed" cache: a stale client guess
 * would flash the wrong unlock state. Until the API answers we report
 * `isLoading` so callers can show a skeleton and keep content locked.
 * (MyFanss/MyFans#1591)
 */
export function useViewerSubscriptionStatus(
  creatorUsernameOrId?: string | null,
): UseViewerSubscriptionStatusResult {
  const { isConnected, address } = useWallet();
  const shouldFetch = Boolean(creatorUsernameOrId) && (isConnected || Boolean(address));

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(shouldFetch);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!creatorUsernameOrId) {
      setStatus(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Logged out / no wallet -> neutral visitor state (locked).
    if (!isConnected && !address) {
      setStatus(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ creator: creatorUsernameOrId });
        const res = await fetch(`/api/v1/subscriptions/me/subscription-state?${params.toString()}`);
        if (!res.ok) {
          // Fall back to checking list endpoint
          const listRes = await fetch('/api/v1/subscriptions/me/list');
          if (listRes.ok) {
            const listData = await listRes.json();
            const items: Record<string, unknown>[] = Array.isArray(listData)
              ? listData
              : (listData.data ?? []);
            const match = items.find(
              (s) =>
                s.creatorId === creatorUsernameOrId ||
                s.creatorUsername === creatorUsernameOrId ||
                s.creator === creatorUsernameOrId,
            );
            if (mounted) {
              setStatus((match?.status as SubscriptionStatus) ?? null);
            }
            return;
          }
          throw new Error('Failed to fetch subscription state');
        }
        const data = await res.json();
        if (mounted) {
          if (data.active) {
            setStatus('active');
          } else if (data.indexedStatus === 'expired' || data.indexed?.status === 'expired') {
            setStatus('expired');
          } else if (data.indexed?.status === 'cancelled') {
            setStatus('cancelled');
          } else {
            setStatus(null);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          // Fail closed: if we can't confirm a subscription, treat as locked.
          setStatus(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
    };
  }, [creatorUsernameOrId, isConnected, address]);

  return { status, isLoading, error };
}

export default useViewerSubscriptionStatus;
