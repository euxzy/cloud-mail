<script lang="ts">
	import { ArrowRight, LoaderCircle } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import TurnstileWidget from '$lib/components/TurnstileWidget.svelte';
	import { apiEnabled } from '$lib/api/client.js';
	import { fetchApiUser, loginApi, registerApi } from '$lib/api/session.svelte.js';
	import { websiteConfig, type WebsiteConfig } from '$lib/api/config.js';
	import { renameApiAccount } from '$lib/api/mail.js';

	let name = $state('');
	let email = $state('');
	let localPart = $state('');
	let domainSuffix = $state('');
	let domainList = $state<string[]>([]);
	let loginDomain = $state(false);
	let password = $state('');
	let confirmPassword = $state('');
	let inviteCode = $state('');
	let verifyToken = $state('');
	let notice = $state('');
	let registrationEnabled = $state(true);
	let invitePolicy = $state(2);
	let verificationRequired = $state(false);
	let siteKey = $state('');
	let config = $state<WebsiteConfig>({});
	let configLoading = $state(true);
	let submitting = $state(false);
	const providerOptions = [
		{ key: 'google', label: 'Google' },
		{ key: 'github', label: 'GitHub' },
		{ key: 'linuxdo', label: 'Linux DO' }
	] as const;
	const providers = $derived(providerOptions.filter((item) => config[`${item.key}Switch` as keyof WebsiteConfig] === 0));
	const normalizedDomains = $derived(domainList.map((item) => item.replace(/^@/, '')));

	onMount(() => {
		if (!apiEnabled) { notice = 'API belum dikonfigurasi. Isi VITE_API_BASE_URL untuk melanjutkan.'; registrationEnabled = false; configLoading = false; return; }
		void websiteConfig().then((value) => {
			config = value;
			registrationEnabled = value.register === 0;
			invitePolicy = Number(value.regKey ?? 2);
			loginDomain = value.loginDomain !== 1;
			domainList = value.domainList ?? [];
			domainSuffix = domainList[0]?.replace(/^@/, '') ?? '';
			siteKey = value.siteKey ?? '';
			verificationRequired = value.registerVerify === 0 || (value.registerVerify === 2 && value.regVerifyOpen === true);
		}).catch((error) => { notice = error instanceof Error ? error.message : 'Konfigurasi API tidak dapat dimuat.'; registrationEnabled = false; }).finally(() => { configLoading = false; });
	});

	function fullEmail() {
		return (loginDomain ? `${localPart.trim()}@${domainSuffix}` : email.trim()).toLowerCase();
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting || configLoading) return;
		if (password !== confirmPassword) { notice = 'The passwords do not match.'; return; }
		if (password.length < 6 || password.length > 30) { notice = 'Password must contain 6 to 30 characters.'; return; }
		if (name.trim().length > 30) { notice = 'Name must be 30 characters or fewer.'; return; }
		if (verificationRequired && !verifyToken) { notice = 'Complete the human verification first.'; return; }
		submitting = true;
		try {
			const accountEmail = fullEmail();
			await registerApi(accountEmail, password, inviteCode, verifyToken);
			const user = await loginApi(accountEmail, password);
			if (name.trim() && user.account?.accountId) {
				await renameApiAccount(user.account.accountId, name.trim());
				await fetchApiUser();
			}
			void goto('/inbox');
		} catch (error) { notice = error instanceof Error ? error.message : 'Pendaftaran gagal.'; }
		finally { submitting = false; }
	}

	function startOAuth(provider: 'google' | 'github' | 'linuxdo') {
		const clientId = config[`${provider}ClientId` as keyof WebsiteConfig];
		if (typeof clientId !== 'string' || !clientId) { notice = 'OAuth provider belum dikonfigurasi.'; return; }
		const redirectUri = `${window.location.origin}/login`;
		const encodedRedirect = encodeURIComponent(redirectUri);
		const urls = {
			linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&response_type=code&scope=openid+profile+email&state=linuxdo`,
			github: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&scope=user:email&state=github`,
			google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&response_type=code&scope=openid+profile+email&state=google`
		};
		sessionStorage.setItem('oauthProvider', provider);
		window.location.assign(urls[provider]);
	}
</script>

<svelte:head><title>Create account · Cloud Mail</title></svelte:head>

<div>
	<p class="text-xs font-semibold text-primary">New workspace</p>
	<h1 class="mt-3 text-[34px] font-semibold tracking-[-0.055em]">Create your account</h1>
	<p class="mt-2 text-sm leading-relaxed text-muted-foreground">Set up your account to manage outgoing email.</p>

	{#if configLoading}
		<div class="mt-6 rounded-xl border bg-muted/20 p-4"><LoadingState label="Loading registration options…" /></div>
	{:else if !registrationEnabled}
		<div class="mt-6 rounded-xl border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground" role={notice ? 'alert' : 'status'}>{notice || 'Public registration is disabled by the administrator. Sign in if you already have an account.'}</div>
	{:else}
		{#if providers.length}
			<div class="mt-6 grid gap-2" style={`grid-template-columns: repeat(${providers.length}, minmax(0, 1fr))`}>
				{#each providers as provider}
					<Button type="button" variant="outline" class="h-10 rounded-lg px-2 text-xs" disabled={submitting} onclick={() => startOAuth(provider.key)}>{provider.label}</Button>
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
				{#if loginDomain}<span class="flex gap-2"><Input bind:value={localPart} type="text" autocomplete="username" required placeholder="name" class="h-11 min-w-0 flex-1 rounded-lg text-sm" /><SelectControl bind:value={domainSuffix} items={normalizedDomains.map((domain) => ({ value: domain, label: `@${domain}` }))} aria-label="Email domain" class="h-11 max-w-[160px] min-w-0 flex-1 text-xs" /></span>{:else}<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />{/if}
			</label>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Password</span>
				<Input bind:value={password} type="password" autocomplete="new-password" minlength={6} required placeholder="At least 8 characters" class="h-11 rounded-lg text-sm" />
			</label>
			<label class="block space-y-1.5 text-[13px] font-medium">
				<span>Confirm password</span>
				<Input bind:value={confirmPassword} type="password" autocomplete="new-password" minlength={6} required placeholder="Enter your password again" class="h-11 rounded-lg text-sm" />
			</label>
			{#if invitePolicy !== 1}
				<label class="block space-y-1.5 text-[13px] font-medium">
					<span>Invite code {#if invitePolicy === 0}<span class="text-destructive">*</span>{:else}<span class="font-normal text-muted-foreground">(if required)</span>{/if}</span>
					<Input bind:value={inviteCode} autocomplete="off" required={invitePolicy === 0} placeholder="Enter your invite code" class="h-11 rounded-lg text-sm" />
				</label>
			{/if}
			{#if verificationRequired && siteKey}<TurnstileWidget {siteKey} onToken={(token) => (verifyToken = token)} />{/if}
			<Button type="submit" class="mt-1 h-11 w-full rounded-lg text-sm" disabled={submitting}>{#if submitting}<LoaderCircle class="animate-spin" data-icon="inline-start" />Creating account…{:else}Create account <ArrowRight data-icon="inline-end" />{/if}</Button>
			{#if notice}<p role="status" class="rounded-lg border bg-muted/30 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">{notice}</p>{/if}
		</form>
	{/if}

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		Already have an account? <a href="/login" class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a>
	</p>
</div>
