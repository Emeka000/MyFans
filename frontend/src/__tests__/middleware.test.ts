import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { DEMO_ROUTE_PREFIXES, demosEnabled, middleware } from '@/middleware';

function request(path: string): NextRequest {
  return new NextRequest(new URL(`https://myfans.example${path}`));
}

describe('demo-route middleware', () => {
  describe('demosEnabled', () => {
    it('is true in development', () => {
      expect(demosEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true);
    });

    it('is true when FLAG_DEMOS=true', () => {
      expect(
        demosEnabled({ NODE_ENV: 'production', FLAG_DEMOS: 'true' } as NodeJS.ProcessEnv),
      ).toBe(true);
    });

    it('is false in a plain production env', () => {
      expect(demosEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
    });
  });

  describe('middleware', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.FLAG_DEMOS;

    function restore() {
      (process.env as NodeJS.ProcessEnv).NODE_ENV = prevEnv;
      if (prevFlag === undefined) delete process.env.FLAG_DEMOS;
      else process.env.FLAG_DEMOS = prevFlag;
    }

    it('404s every demo route in production', () => {
      (process.env as NodeJS.ProcessEnv).NODE_ENV = 'production';
      delete process.env.FLAG_DEMOS;

      for (const prefix of DEMO_ROUTE_PREFIXES) {
        const res = middleware(request(prefix));
        expect(res.status).toBe(404);
        expect(res.headers.get('x-robots-tag')).toContain('noindex');
      }

      restore();
    });

    it('serves demo routes but marks them noindex when demos are enabled', () => {
      (process.env as NodeJS.ProcessEnv).NODE_ENV = 'development';

      const res = middleware(request('/wallet-demo'));
      expect(res.status).not.toBe(404);
      expect(res.headers.get('x-robots-tag')).toContain('noindex');

      restore();
    });
  });
});
