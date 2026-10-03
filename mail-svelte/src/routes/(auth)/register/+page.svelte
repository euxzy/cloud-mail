<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { adminRoles, adminUsers, inviteCodes } from '$lib/admin-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { hydratePreviewData, persistPreviewData, setPreviewPassword, signInPreview } from '$lib/preview-state.svelte.js';

	let name = $state('');
	let email = $state('');
	let localPart = $state('');
	let domainSuffix = $state('cloudmail.id');
	let domainList = $state<string[]>(['cloudmail.id']);
	let loginDomain = $state(false);
	let password = $state('');
	let confirmPassword = $state('');
	let inviteCode = $state('');
	let notice = $state('');
	let registrationEnabled = $state(true);
	let invitePolicy = $state('Optional');
	let turnstileEnabled = $state(true);
	let allowedDomains = $state('');
	let hydration: Promise<void> = Promise.resolve();
	const providerNames = ['Google', 'GitHub', 'Linux DO'] as const;
	type OAuthProvider = (typeof providerNames)[number];
	let providerFlags = $state<Record<OAuthProvider, boolean>>({ Google: true, GitHub: true, 'Linux DO': false });
	const providers = $derived(providerNames.filter((provider) => providerFlags[provider]));

	onMount(() => {
		hydration = hydratePreviewData();
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
				allowDomains?: string;
				loginDomain?: boolean;
			};
			if (typeof settings.registration === 'boolean') registrationEnabled = settings.registration;
			if (settings.inviteMode) invitePolicy = settings.inviteMode;
			if (typeof settings.turnstile === 'boolean') turnstileEnabled = settings.turnstile;
			if (typeof settings.googleOAuth === 'boolean') providerFlags.Google = settings.googleOAuth;
			if (typeof settings.githubOAuth === 'boolean') providerFlags.GitHub = settings.githubOAuth;
			if (typeof settings.linuxDoOAuth === 'boolean') providerFlags['Linux DO'] = settings.linuxDoOAuth;
			allowedDomains = settings.allowDomains ?? '';
			loginDomain = settings.loginDomain ?? false;
			const domains = allowedDomains.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
			if (domains.length) { domainList = domains; domainSuffix = domains[0]; }
		} catch {
			return;
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		await hydration;
		if (!registrationEnabled) {
			notice = 'Registration is disabled by the administrator.';
			return;
		}
		if (password !== confirmPassword) {
			notice = 'The passwords do not match.';
			return;
		}
		const normalizedEmail = (loginDomain ? `${localPart.trim()}@${domainSuffix}` : email.trim()).toLowerCase();
		const domains = allowedDomains.split(/[\n,]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
		if (domains.length && !domains.includes(normalizedEmail.split('@')[1])) { notice = 'This email domain is not allowed.'; return; }
		if (adminUsers.some((user) => user.email.toLowerCase() === normalizedEmail)) {
			notice = 'An account with this email already exists.';
			return;
		}
		const matchingCode = inviteCodes.find((item) => item.code.toLowerCase() === inviteCode.trim().toLowerCase());
		if (invitePolicy === 'Required' && !matchingCode) { notice = 'Enter a valid invite code.'; return; }
		if (inviteCode.trim() && !matchingCode) { notice = 'This invite code was not found.'; return; }
		if (matchingCode && (matchingCode.uses < 1 || new Date(matchingCode.expires).getTime() < Date.now())) {
			notice = 'This invite code is exhausted or expired.';
			return;
		}
		const role = matchingCode?.role ?? adminRoles.find((item) => item.default)?.name ?? 'Member';
		adminUsers.push({ id: Math.max(0, ...adminUsers.map((user) => user.id)) + 1, email: normalizedEmail, name: name.trim(), role, status: 'Active', mailboxes: 1, sent: 0, created: new Date().toISOString().slice(0, 10) });
		mailAccounts.push({ id: Math.max(0, ...mailAccounts.map((account) => account.id)) + 1, email: normalizedEmail, ownerEmail: normalizedEmail, primary: true, pinned: true, allMail: false });
		await setPreviewPassword(normalizedEmail, password);
		if (matchingCode) {
			matchingCode.uses -= 1;
			matchingCode.history = [...(matchingCode.history ?? []), { email: normalizedEmail, date: new Date().toLocaleDateString() }];
		}
		await persistPreviewData();
		await signInPreview(normalizedEmail, password);
		void goto('/inbox');
	}

	async function startOAuth(_provider: OAuthProvider) {
		await hydration;
		const error = await signInPreview('sarah@cloudmail.id');
		if (error) { notice = error; return; }
		void goto('/inbox');
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
				{#if loginDomain}<span class="flex gap-2"><Input bind:value={localPart} type="text" autocomplete="username" required placeholder="name" class="h-11 min-w-0 flex-1 rounded-lg text-sm" /><SelectControl bind:value={domainSuffix} items={domainList.map((domain) => ({ value: domain, label: `@${domain}` }))} aria-label="Email domain" class="h-11 max-w-[160px] min-w-0 flex-1 text-xs" /></span>{:else}<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />{/if}
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
			{#if turnstileEnabled}<div class="rounded-lg border bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">Bot verification is simulated in this local preview.</div>{/if}
			<Button type="submit" class="mt-1 h-11 w-full rounded-lg text-sm">Create account <ArrowRight data-icon="inline-end" /></Button>
			{#if notice}<p role="status" class="rounded-lg border bg-muted/30 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">{notice}</p>{/if}
		</form>
	{/if}

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		Already have an account? <a href="/login" class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a>
	</p>
</div>
