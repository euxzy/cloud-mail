<script lang="ts">
	import { ArrowRight, Eye, EyeOff } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { hydratePreviewData, loadPreviewSession, previewSession, signInPreview } from '$lib/preview-state.svelte.js';

	let email = $state('');
	let password = $state('');
	let localPart = $state('');
	let domainSuffix = $state('cloudmail.id');
	let domainList = $state<string[]>(['cloudmail.id']);
	let loginDomain = $state(false);
	let showPassword = $state(false);
	let notice = $state('');
	let hydration: Promise<void> = Promise.resolve();
	const providerNames = ['Google', 'GitHub', 'Linux DO'] as const;
	type OAuthProvider = (typeof providerNames)[number];
	let providerFlags = $state<Record<OAuthProvider, boolean>>({ Google: true, GitHub: true, 'Linux DO': false });
	const providers = $derived(providerNames.filter((provider) => providerFlags[provider]));

	onMount(() => {
		hydration = hydratePreviewData();
		void (async () => {
			await hydration;
			loadPreviewSession();
			if (previewSession.email) void goto('/inbox');
		})();
		const stored = localStorage.getItem('cloud-mail-system-settings-preview');
		if (!stored) return;
		try {
			const settings = JSON.parse(stored) as { googleOAuth?: boolean; githubOAuth?: boolean; linuxDoOAuth?: boolean; loginDomain?: boolean; allowDomains?: string };
			if (typeof settings.googleOAuth === 'boolean') providerFlags.Google = settings.googleOAuth;
			if (typeof settings.githubOAuth === 'boolean') providerFlags.GitHub = settings.githubOAuth;
			if (typeof settings.linuxDoOAuth === 'boolean') providerFlags['Linux DO'] = settings.linuxDoOAuth;
			loginDomain = settings.loginDomain ?? false;
			const domains = settings.allowDomains?.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
			if (domains?.length) { domainList = domains; domainSuffix = domains[0]; }
		} catch {
			return;
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		await hydration;
		const error = await signInPreview(loginDomain ? `${localPart.trim()}@${domainSuffix}` : email, password);
		if (error) { notice = error; return; }
		void goto('/inbox');
	}

	async function startOAuth(_provider: OAuthProvider) {
		await hydration;
		const error = await signInPreview('sarah@cloudmail.id');
		if (error) { notice = error; return; }
		void goto('/inbox');
	}
</script>

<svelte:head><title>Sign in · Cloud Mail</title></svelte:head>

<div>
	<p class="text-xs font-semibold text-primary">Your workspace</p>
	<h1 class="mt-3 text-[34px] font-semibold tracking-[-0.055em]">Welcome back</h1>
	<p class="mt-2 text-sm leading-relaxed text-muted-foreground">Sign in with your account email to continue.</p>

	{#if providers.length}
		<div class="mt-6 grid gap-2" style={`grid-template-columns: repeat(${providers.length}, minmax(0, 1fr))`}>
			{#each providers as provider}
				<Button type="button" variant="outline" class="h-10 rounded-lg px-2 text-xs" onclick={() => startOAuth(provider)}>{provider}</Button>
			{/each}
		</div>
		<div class="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span class="h-px flex-1 bg-border"></span><span>or continue with email</span><span class="h-px flex-1 bg-border"></span></div>
	{/if}

	<form class="mt-7 space-y-5" onsubmit={submit}>
		<label class="block space-y-2 text-[13px] font-medium">
			<span>Email address</span>
			{#if loginDomain}<span class="flex gap-2"><Input bind:value={localPart} type="text" autocomplete="username" required placeholder="name" class="h-11 min-w-0 flex-1 rounded-lg text-sm" /><SelectControl bind:value={domainSuffix} items={domainList.map((domain) => ({ value: domain, label: `@${domain}` }))} aria-label="Email domain" class="h-11 max-w-[160px] min-w-0 flex-1 text-xs" /></span>{:else}<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />{/if}
		</label>
		<label class="block space-y-2 text-[13px] font-medium">
			<span>Password</span>
			<span class="relative block">
				<Input bind:value={password} type={showPassword ? 'text' : 'password'} autocomplete="current-password" required placeholder="Enter your password" class="h-11 rounded-lg pr-10 text-sm" />
				<button type="button" class="absolute inset-y-0 right-2 inline-flex items-center px-1 text-muted-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => (showPassword = !showPassword)}>
					{#if showPassword}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
				</button>
			</span>
		</label>
		<Button type="submit" class="mt-1 h-11 w-full rounded-lg text-sm">Sign in <ArrowRight data-icon="inline-end" /></Button>
		{#if notice}
			<div class="rounded-lg border bg-muted/30 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground" role="status">{notice}</div>
		{/if}
	</form>
	<p class="mt-3 text-center text-[11px] text-muted-foreground">Local demo: use sarah@cloudmail.id with any password.</p>

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		New to Cloud Mail? <a href="/register" class="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</a>
	</p>
</div>
