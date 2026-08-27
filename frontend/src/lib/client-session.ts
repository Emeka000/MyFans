'use client';

import type { WalletType } from '@/types/wallet';

const WALLET_KEY = 'myfans.wallet.session.v1';

export interface WalletSession {
  address: string;
  walletType: WalletType;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or invalid client state should be cleared instead of crashing UI.
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getWalletSession(): WalletSession | null {
  const session = readJson<WalletSession>(WALLET_KEY);
  if (!session?.address || !session?.walletType) return null;
  return session;
}

export function setWalletSession(session: WalletSession): void {
  writeJson(WALLET_KEY, session);
}

export function clearWalletSession(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(WALLET_KEY);
}
