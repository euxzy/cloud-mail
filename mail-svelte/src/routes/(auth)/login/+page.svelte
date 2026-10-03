<script lang="ts">
	import { ArrowRight, Eye, EyeOff } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let notice = $state('');
	let resetNotice = $state(false);
	const providerNames = ['Google', 'GitHub', 'Linux DO'] as const;
	type OAuthProvider = (typeof providerNames)[number];
	let providerFlags = $state<Record<OAuthProvider, boolean>>({ Google: true, GitHub: true, 'Linux DO': false });
	const providers = $derived(providerNames.filter((provider) => providerFlags[provider]));

	onMount(() => {
		const stored = localStorage.getItem('cloud-mail-system-settings-preview');
		if (!stored) return;
		try {
			const settings = JSON.parse(stored) as { googleOAuth?: boolean; githubOAuth?: boolean; linuxDoOAuth?: boolean };
			if (typeof settings.googleOAuth === 'boolean') providerFlags.Google = settings.googleOAuth;
			if (typeof settings.githubOAuth === 'boolean') providerFlags.GitHub = settings.githubOAuth;
			if (typeof settings.linuxDoOAuth === 'boolean') providerFlags['Linux DO'] = settings.linuxDoOAuth;
		} catch {
			return;
		}
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		notice = 'Sign-in is not connected in this preview. You can still explore the inbox.';
	}

	function startOAuth(provider: OAuthProvider) {
		notice = `${provider} sign-in is not configured in this preview.`;
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
			<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />
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
		<div class="flex items-center justify-between pt-0.5">
			<label class="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" class="size-3.5 accent-primary" /> Keep me signed in</label>
			<button type="button" class="text-xs font-medium text-primary underline-offset-4 hover:underline" onclick={() => (resetNotice = true)}>Forgot password?</button>
		</div>
		{#if resetNotice}<p class="-mt-2 text-[10px] text-muted-foreground" role="status">Password recovery is not connected in this preview.</p>{/if}
		<Button type="submit" class="mt-1 h-11 w-full rounded-lg text-sm">Sign in <ArrowRight data-icon="inline-end" /></Button>
		{#if notice}
			<div class="rounded-lg border bg-muted/30 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground" role="status">
				{notice} <a href="/inbox" class="font-semibold text-foreground underline underline-offset-2">Open inbox</a>
			</div>
		{/if}
	</form>

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		New to Cloud Mail? <a href="/register" class="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</a>
	</p>
</div>
