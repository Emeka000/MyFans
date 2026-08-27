import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWalletSession,
  getWalletSession,
  setWalletSession,
} from '../client-session';

describe('client session storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and restores wallet session', () => {
    setWalletSession({
      address: 'GABCDEF1234567890',
      walletType: 'freighter',
    });

    expect(getWalletSession()).toEqual({
      address: 'GABCDEF1234567890',
      walletType: 'freighter',
    });
  });

  it('clears wallet session', () => {
    setWalletSession({
      address: 'GABCDEF1234567890',
      walletType: 'freighter',
    });
    clearWalletSession();
    expect(getWalletSession()).toBeNull();
  });

  it('returns null and clears invalid wallet JSON', () => {
    window.localStorage.setItem('myfans.wallet.session.v1', '{invalid-json');
    expect(getWalletSession()).toBeNull();
    expect(window.localStorage.getItem('myfans.wallet.session.v1')).toBeNull();
  });
});
