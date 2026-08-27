# Network mismatch guard

**Problem (MyFanss/MyFans#1589):** a testnet deployment + a wallet
(Freighter/Lobstr) set to mainnet can broadcast to the wrong network. The
app builds a transaction with its configured (testnet) passphrase; the
wallet re-signs under the `PUBLIC` passphrase; the transaction lands on
mainnet.

## Two layers

### 1. UI — `useNetworkGuard` / `<NetworkMismatchBanner>`

`useNetworkGuard()` compares `getRuntimeContractConfig().network` with the
wallet's `getNetwork()` and re-checks on `freighter:networkChanged` /
`lobstr:networkChanged`. `<NetworkMismatchBanner>` renders a blocking
banner and is mounted on every page that triggers a mutating chain call:

- `/subscribe` (`ConfirmationScreen`)
- `/subscriptions` (cancel / renew)
- `/dashboard/plans` (create plan)

### 2. Enforcement — `assertWalletNetworkMatch()` (`src/lib/network-guard.ts`)

The banner is advisory; it can't stop a caller. The hard stop is a
non-React guard invoked at the two choke points:

| Choke point                         | Location                     |
| ----------------------------------- | ---------------------------- |
| Signing any transaction             | `signTransaction` in `src/lib/wallet.ts` |
| Submitting a Soroban transaction    | `submitTransaction`, `submitCreatePlanTx` in `src/lib/stellar.ts` |

On mismatch it throws:

```ts
createAppError('NETWORK_MISMATCH', {
  context: { expected, detected },
})
```

`NETWORK_MISMATCH` is a **stable** error code (`src/types/errors.ts`).

### What is *not* guarded

Read-only simulation (`checkSubscription` → `simulateTransaction`) never
calls the guard — a status read is safe on any network and must keep
working even when the wallet is on the wrong one.

When the wallet network can't be determined (no wallet, no `getNetwork`
support, or the call throws), the guard is a **no-op** — it never hard-
blocks on a flaky probe.

## Out of scope

Automatically switching the wallet's network via a wallet API.
