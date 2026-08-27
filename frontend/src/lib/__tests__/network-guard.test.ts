import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertWalletNetworkMatch,
  detectWalletNetwork,
  getNetworkMismatch,
} from '@/lib/network-guard';

vi.mock('@/lib/contract-config', () => ({
  getRuntimeContractConfig: vi.fn(() => ({ network: 'testnet' })),
}));

function setFreighter(getNetwork?: () => Promise<{ network: string }>) {
  (window as unknown as { freighter?: unknown }).freighter = getNetwork
    ? { getNetwork }
    : undefined;
}

function setLobstr(getNetwork?: () => Promise<{ network: string }>) {
  (window as unknown as { lobstr?: unknown }).lobstr = getNetwork ? { getNetwork } : undefined;
}

describe('network-guard', () => {
  beforeEach(() => {
    setFreighter(undefined);
    setLobstr(undefined);
  });

  afterEach(() => {
    delete (window as unknown as { freighter?: unknown }).freighter;
    delete (window as unknown as { lobstr?: unknown }).lobstr;
    vi.clearAllMocks();
  });

  it('returns null network when no wallet is present', async () => {
    expect(await detectWalletNetwork()).toBeNull();
  });

  it('does not throw when the wallet network cannot be determined', async () => {
    await expect(assertWalletNetworkMatch()).resolves.toBeUndefined();
  });

  it('does not throw when wallet and app agree', async () => {
    setFreighter(async () => ({ network: 'TESTNET' }));
    expect(await getNetworkMismatch()).toBeNull();
    await expect(assertWalletNetworkMatch()).resolves.toBeUndefined();
  });

  it('throws NETWORK_MISMATCH when the wallet is on another network', async () => {
    setFreighter(async () => ({ network: 'PUBLIC' }));

    await expect(assertWalletNetworkMatch()).rejects.toMatchObject({
      code: 'NETWORK_MISMATCH',
      context: { expected: 'testnet', detected: 'PUBLIC' },
    });
  });

  it('treats a thrown getNetwork() as "unknown" and allows the action', async () => {
    setFreighter(async () => {
      throw new Error('wallet locked');
    });
    await expect(assertWalletNetworkMatch()).resolves.toBeUndefined();
  });

  it('falls back to Lobstr when Freighter is absent', async () => {
    setLobstr(async () => ({ network: 'PUBLIC' }));
    await expect(assertWalletNetworkMatch()).rejects.toMatchObject({ code: 'NETWORK_MISMATCH' });
  });
});
