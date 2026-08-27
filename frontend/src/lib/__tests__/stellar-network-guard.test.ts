import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The mutating stellar.ts entry points must refuse to broadcast while the
 * wallet is on the wrong network (MyFanss/MyFans#1589).
 */
vi.mock('@/lib/contract-config', () => ({
  getStellarRuntimeConfig: () => ({
    network: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    subscriptionContractId: 'C'.repeat(56),
    contractIds: { token: 'C'.repeat(56), subscription: 'C'.repeat(56) },
  }),
  getRuntimeContractConfig: () => ({ network: 'testnet' }),
}));

vi.mock('@/lib/wallet', () => ({ signTransaction: vi.fn(async () => 'SIGNED') }));

import { submitTransaction, submitCreatePlanTx } from '@/lib/stellar';

function setFreighterNetwork(network: string) {
  (window as unknown as { freighter?: unknown }).freighter = {
    getNetwork: async () => ({ network }),
  };
}

describe('stellar mutating calls — network guard', () => {
  beforeEach(() => {
    setFreighterNetwork('PUBLIC'); // wallet on mainnet, app on testnet
  });

  afterEach(() => {
    delete (window as unknown as { freighter?: unknown }).freighter;
    vi.clearAllMocks();
  });

  it('submitTransaction refuses on mismatch with a stable NETWORK_MISMATCH code', async () => {
    await expect(submitTransaction('XDR')).rejects.toMatchObject({ code: 'NETWORK_MISMATCH' });
  });

  it('submitCreatePlanTx refuses on mismatch', async () => {
    await expect(submitCreatePlanTx('XDR')).rejects.toMatchObject({ code: 'NETWORK_MISMATCH' });
  });

  it('allows submission once the wallet is back on the expected network', async () => {
    setFreighterNetwork('TESTNET');
    // Now the guard passes and we fail later (no real RPC) with a *different* code.
    await expect(submitTransaction('not-a-real-xdr')).rejects.not.toMatchObject({
      code: 'NETWORK_MISMATCH',
    });
  });
});
