# Demo / showcase routes

Some routes under `src/app` exist only for local development and design
review — component showcases, wallet-modal sandboxes, deliberate error
pages. They must **not** be reachable in production: they leak in-progress
UI, pollute SEO, and widen the attack surface (`/error-test` throws on
purpose).

| Route               | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `/wallet-demo`      | Wallet selection / connection modal sandbox |
| `/error-test`       | Triggers an error boundary on demand      |
| `/ui`               | Component library showcase                 |
| `/subscribe-example`| Static subscribe layout reference         |
| `/settings-demo`    | Settings shell prototype                   |
| `/pending`          | Pending-transaction status prototype       |

## How the gate works

`src/middleware.ts` matches these prefixes and:

- **Production** (`NODE_ENV=production`, no `FLAG_DEMOS`): rewrites to a
  non-existent path so Next serves a real **404**, and adds
  `X-Robots-Tag: noindex, nofollow`.
- **Development** (`NODE_ENV=development`) or **`FLAG_DEMOS=true`**: the
  route renders normally but still carries `X-Robots-Tag: noindex`.

`FLAG_DEMOS=true` is the escape hatch for preview deployments that want the
showcase available. It is a **build-time** env var (middleware inlines
`process.env` references at build), so set it in the deploy/build
environment, not at runtime.

## Adding or removing a demo route

1. Add the route directory under `src/app`.
2. Add its prefix to `DEMO_ROUTE_PREFIXES` **and** `config.matcher` in
   `src/middleware.ts`.
3. `npm run check:demo-routes` (also runs in CI) fails if a demo-looking
   route directory is missing from the gate list, or the gate list points
   at a directory that no longer exists.

CI additionally runs `scripts/assert-demo-routes-404.mjs` after the
production build to confirm every demo path actually returns 404.

## `/pending`

`/pending` is currently a prototype. It is gated as a demo route until it
is either wired to real pending-transaction data or removed. See
MyFanss/MyFans#1596.
