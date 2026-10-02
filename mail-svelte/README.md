# Cloud Mail — Svelte frontend

This is the new frontend, kept alongside the existing `mail-vue` application. The Vue frontend and current Worker deployment remain unchanged while screens are migrated.

## Stack

- SvelteKit and Svelte 5
- Vite and TypeScript
- Tailwind CSS 4
- shadcn-svelte Nova preset
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
