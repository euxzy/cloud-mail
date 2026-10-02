<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<svelte:head>
	<title>Cloud Mail</title>
	<meta name="description" content="Cloud Mail frontend built with SvelteKit." />
</svelte:head>

<main class="flex min-h-svh items-center justify-center bg-background px-6 py-12">
	<section class="w-full max-w-xl">
		<p class="text-sm font-medium tracking-wide text-muted-foreground">CLOUD MAIL</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Frontend baru sedang disiapkan.</h1>
		<p class="mt-3 text-muted-foreground">
			Fondasi SvelteKit dan Nova berjalan terpisah. Frontend Vue dan layanan Worker yang ada tetap utuh selama layar aplikasi dipindahkan.
		</p>

		<Card.Root class="mt-8">
			<Card.Header>
				<Card.Title>Fondasi UI siap</Card.Title>
				<Card.Description>SvelteKit, TypeScript, Tailwind CSS, dan shadcn-svelte Nova.</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">
					Build statis ini memakai fallback SPA dan dapat dihubungkan ke API Hono yang sudah ada saat migrasi UI dimulai.
				</p>
			</Card.Content>
		</Card.Root>
	</section>
</main>
