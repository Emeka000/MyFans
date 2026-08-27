/**
 * Non-React network guard for mutating Stellar actions.
 *
 * `useNetworkGuard` (a hook) powers the UI banner, but the builders in
 * `@/lib/stellar` and the signer in `@/lib/wallet` run outside React and
 * must independently refuse to sign or submit a transaction when the
 * connected wallet is on a different network than the app's runtime config.
 *
 * Without this, a testnet deployment + a Freighter set to mainnet can build
 * a transaction with the app's (testnet) passphrase, have the wallet
 * re-sign it under the PUBLIC passphrase, and broadcast to the wrong
 * network. See MyFanss/MyFans#1589.
 *
 * Read-only simulation (`checkSubscription`) deliberately does NOT call
 * this — a status check is safe on any network and must keep working.
 */
import { createAppError, type AppError } from '@/types/errors';
import { getRuntimeContractConfig } from '@/lib/contract-config';

/** Stable, documented error code thrown on a wallet/app network mismatch. */
export const NETWORK_MISMATCH_CODE = 'NETWORK_MISMATCH' as const;

/** Maps our config network names to the strings wallets report. */
const NETWORK_NAME_MAP: Record<string, string> = {
  testnet: 'TESTNET',
  futurenet: 'FUTURENET',
  mainnet: 'PUBLIC',
};

interface WalletNetworkProbe {
  getNetwork?: () => Promise<{ network?: string; networkPassphrase?: string }>;
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>;
}

interface WindowWithWallets extends Window {
  freighter?: WalletNetworkProbe;
  lobstr?: WalletNetworkProbe;
}

/**
 * Best-effort read of the connected wallet's current network name.
 * Returns `null` when it can't be determined — no wallet, no `getNetwork`
 * support, or the call throws (locked wallet). Callers treat `null` as
 * "can't prove a mismatch" and proceed.
 */
export async function detectWalletNetwork(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const w = window as WindowWithWallets;
  const probe = w.freighter ?? w.lobstr;
  const getNetwork = probe?.getNetwork ?? probe?.getNetworkDetails;
  if (!probe || !getNetwork) return null;

  try {
    const result = await getNetwork.call(probe);
    return result?.network ?? null;
  } catch {
    return null;
  }
}

export interface NetworkMismatchInfo {
  expected: string;
  detected: string;
}

/**
 * Compare the app's expected network with the wallet's reported network.
 * Returns mismatch details, or `null` when they match / can't be compared.
 */
export async function getNetworkMismatch(): Promise<NetworkMismatchInfo | null> {
  const expected = getRuntimeContractConfig().network;
  const detected = await detectWalletNetwork();
  if (!detected) return null;

  const expectedUpper = (NETWORK_NAME_MAP[expected] ?? expected).toUpperCase();
  const detectedUpper = detected.toUpperCase();

  if (detectedUpper === expectedUpper) return null;
  return { expected, detected };
}

/** Build the canonical NETWORK_MISMATCH AppError. */
export function networkMismatchError(info: NetworkMismatchInfo): AppError {
  return createAppError(NETWORK_MISMATCH_CODE, {
    message: 'Your wallet is on the wrong network',
    description: `This app runs on ${info.expected}, but your wallet is connected to ${info.detected}. Switch your wallet to ${info.expected} and try again.`,
    context: { expected: info.expected, detected: info.detected },
  });
}

/**
 * Throw `NETWORK_MISMATCH` when the connected wallet is on a different
 * network than the app expects. No-op when there's no wallet or the
 * network can't be read. Call immediately before signing or submitting a
 * mutating transaction — never before a read-only simulation.
 */
export async function assertWalletNetworkMatch(): Promise<void> {
  const mismatch = await getNetworkMismatch();
  if (mismatch) {
    throw networkMismatchError(mismatch);
  }
}
