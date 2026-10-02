# Cloud Mail — Svelte frontend

This is the new frontend, kept alongside the existing `mail-vue` application. The Vue frontend and current Worker deployment remain unchanged while screens are migrated.

## Stack

- SvelteKit and Svelte 5
- Vite and TypeScript
- Tailwind CSS 4
- shadcn-svelte Vega preset
- `adapter-static` with an `index.html` SPA fallback for Workers Static Assets

## Development

```sh
pnpm install
pnpm run dev
```

## Check and build

```sh
pnpm run check
pnpm run build
```

The static output is written to `build/`. The existing `mail-worker` deployment still builds and serves `mail-vue`; switch its asset directory and build command only after the Svelte frontend has the required application screens.

## Routes

- `/inbox`, `/starred`, `/draft`, and `/sent` mail folders (`/` opens inbox)
- `/mail/[id]` message detail
- compose overlay available from the app shell
- `/settings` account profile, security, and language preferences
- `/analysis` mail and account analytics
- `/all-mail` mail management and bulk actions
- `/all-users`, `/role`, and `/invite-code` user access management
- `/system-settings` registration, mail, login, and OAuth settings
- `/login` and `/register` authentication screens

The current pages use local sample data. Authentication, OAuth, settings persistence, and email delivery are not connected to the Worker API yet.
