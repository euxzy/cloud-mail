<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let inviteCode = $state('');
	let notice = $state('');
	let registrationEnabled = $state(true);
	let invitePolicy = $state('Optional');
	let turnstileEnabled = $state(true);
	const providerNames = ['Google', 'GitHub', 'Linux DO'] as const;
	type OAuthProvider = (typeof providerNames)[number];
	let providerFlags = $state<Record<OAuthProvider, boolean>>({ Google: true, GitHub: true, 'Linux DO': false });
	const providers = $derived(providerNames.filter((provider) => providerFlags[provider]));

	onMount(() => {
		const stored = localStorage.getItem('cloud-mail-system-settings-preview');
		if (!stored) return;
		try {
			const settings = JSON.parse(stored) as {
				registration?: boolean;
				inviteMode?: string;
				turnstile?: boolean;
				googleOAuth?: boolean;
				githubOAuth?: boolean;
				linuxDoOAuth?: boolean;
			};
			if (typeof settings.registration === 'boolean') registrationEnabled = settings.registration;
			if (settings.inviteMode) invitePolicy = settings.inviteMode;
			if (typeof settings.turnstile === 'boolean') turnstileEnabled = settings.turnstile;
			if (typeof settings.googleOAuth === 'boolean') providerFlags.Google = settings.googleOAuth;
			if (typeof settings.githubOAuth === 'boolean') providerFlags.GitHub = settings.githubOAuth;
			if (typeof settings.linuxDoOAuth === 'boolean') providerFlags['Linux DO'] = settings.linuxDoOAuth;
		} catch {
			return;
		}
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!registrationEnabled) {
			notice = 'Registration is disabled by the administrator.';
			return;
		}
		if (password !== confirmPassword) {
			notice = 'The passwords do not match.';
			return;
		}
		notice = inviteCode.trim()
			? 'Registration is not connected in this preview. Your invite code has not been submitted.'
			: 'Registration is not connected in this preview.';
	}

	function startOAuth(provider: OAuthProvider) {
		notice = `${provider} sign-up is not configured in this preview.`;
	}
</script>

<svelte:head><title>Create account · Cloud Mail</title></svelte:head>

<div>
	<p class="text-xs font-semibold text-primary">New workspace</p>
	<h1 class="mt-3 text-[34px] font-semibold tracking-[-0.055em]">Create your account</h1>
	<p class="mt-2 text-sm leading-relaxed text-muted-foreground">Set up your workspace to manage outgoing email.</p>

	{#if !registrationEnabled}
		<div class="mt-6 rounded-xl border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground" role="status">Public registration is disabled by the administrator. Sign in if you already have an account.</div>
	{:else}
		{#if providers.length}
			<div class="mt-6 grid gap-2" style={`grid-template-columns: repeat(${providers.length}, minmax(0, 1fr))`}>
				{#each providers as provider}
					<Button type="button" variant="outline" class="h-10 rounded-lg px-2 text-xs" onclick={() => startOAuth(provider)}>{provider}</Button>
				{/each}
			</div>
			<div class="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span class="h-px flex-1 bg-border"></span><span>or sign up with email</span><span class="h-px flex-1 bg-border"></span></div>
		{/if}

		<form class="mt-7 space-y-4" onsubmit={submit}>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Full name</span>
				<Input bind:value={name} autocomplete="name" required placeholder="Your name" class="h-11 rounded-lg text-sm" />
			</label>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Email address</span>
				<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />
			</label>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Password</span>
				<Input bind:value={password} type="password" autocomplete="new-password" minlength={8} required placeholder="At least 8 characters" class="h-11 rounded-lg text-sm" />
			</label>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Confirm password</span>
				<Input bind:value={confirmPassword} type="password" autocomplete="new-password" minlength={8} required placeholder="Enter your password again" class="h-11 rounded-lg text-sm" />
			</label>
			{#if invitePolicy !== 'Disabled'}
				<label class="block space-y-1.5 text-[13px] font-medium">
					<span>Invite code {#if invitePolicy === 'Required'}<span class="text-destructive">*</span>{:else}<span class="font-normal text-muted-foreground">(if required)</span>{/if}</span>
					<Input bind:value={inviteCode} autocomplete="off" required={invitePolicy === 'Required'} placeholder="Enter your invite code" class="h-11 rounded-lg text-sm" />
				</label>
			{/if}
			{#if turnstileEnabled}<div class="rounded-lg border bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">Cloudflare Turnstile verification is enabled but unavailable in this UI preview.</div>{/if}
			<Button type="submit" class="mt-1 h-11 w-full rounded-lg text-sm">Create account <ArrowRight data-icon="inline-end" /></Button>
			{#if notice}<p role="status" class="rounded-lg border bg-muted/30 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">{notice}</p>{/if}
		</form>
	{/if}

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		Already have an account? <a href="/login" class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a>
	</p>
</div>
