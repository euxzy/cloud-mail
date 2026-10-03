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

## Worker API

Set `VITE_API_BASE_URL` in `.env` to the Worker API base, including `/api`:

```sh
VITE_API_BASE_URL=http://127.0.0.1:8787/api
```

The Svelte app requires this value to connect to the Worker. Sign in, registration, mailbox accounts and messages, compose/send, profile and security settings, analytics, all-mail, users, roles, invite codes, and system settings use the Worker API. Requests use the browser's native `fetch` API and send the JWT in the `Authorization` header. Mail folders load 50 messages at a time with cursor pagination. Draft text and draft attachments are kept in browser storage, matching the Vue app's local draft behavior. There is no local preview-data fallback.

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

OAuth sign-in and account binding, message attachments, and administrative settings use the Worker API. Drafts remain in browser storage because the Worker does not expose a draft endpoint.
