<script lang="ts">
	import { ArrowRight, Eye, EyeOff } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { apiEnabled } from '$lib/api/client.js';
	import { bindOAuthUser, loadApiSession, loginApi, loginOAuth } from '$lib/api/session.svelte.js';
	import { websiteConfig, type WebsiteConfig } from '$lib/api/config.js';

	let email = $state('');
	let password = $state('');
	let localPart = $state('');
	let domainSuffix = $state('');
	let domainList = $state<string[]>([]);
	let loginDomain = $state(false);
	let showPassword = $state(false);
	let notice = $state('');
	let bindingOAuth = $state(false);
	let bindEmail = $state('');
	let bindCode = $state('');
	let oauthUserId = $state('');
	let config = $state<WebsiteConfig>({});
	const providerOptions = [
		{ key: 'google', label: 'Google' },
		{ key: 'github', label: 'GitHub' },
		{ key: 'linuxdo', label: 'Linux DO' }
	] as const;
	type OAuthProvider = (typeof providerOptions)[number]['key'];
	const providers = $derived(providerOptions.filter((item) => config[`${item.key}Switch` as keyof WebsiteConfig] === 0));
	const normalizedDomains = $derived(domainList.map((item) => item.replace(/^@/, '')));

	onMount(() => {
		if (!apiEnabled) { notice = 'API belum dikonfigurasi. Isi VITE_API_BASE_URL untuk melanjutkan.'; return; }
		void websiteConfig().then((value) => {
			config = value;
			loginDomain = value.loginDomain !== 1;
			domainList = value.domainList ?? [];
			domainSuffix = domainList[0]?.replace(/^@/, '') ?? '';
		}).catch((error) => { notice = error instanceof Error ? error.message : 'Konfigurasi API tidak dapat dimuat.'; });
		void loadApiSession().then((user) => { if (user) void goto('/inbox'); }).catch(() => undefined);
		void finishOAuth();
	});

	function fullEmail(value: string) {
		return (loginDomain ? `${value.trim()}@${domainSuffix}` : value.trim()).toLowerCase();
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		try {
			await loginApi(fullEmail(loginDomain ? localPart : email), password);
			void goto('/inbox');
		} catch (error) { notice = error instanceof Error ? error.message : 'Login gagal.'; }
	}

	function startOAuth(provider: OAuthProvider) {
		const clientId = config[`${provider}ClientId` as keyof WebsiteConfig];
		if (typeof clientId !== 'string' || !clientId) { notice = 'OAuth provider belum dikonfigurasi.'; return; }
		const redirectUri = `${window.location.origin}/login`;
		const encodedRedirect = encodeURIComponent(redirectUri);
		const urls: Record<OAuthProvider, string> = {
			linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&response_type=code&scope=openid+profile+email&state=linuxdo`,
			github: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&scope=user:email&state=github`,
			google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodedRedirect}&response_type=code&scope=openid+profile+email&state=google`
		};
		sessionStorage.setItem('oauthProvider', provider);
		window.location.assign(urls[provider]);
	}

	async function finishOAuth() {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const provider = params.get('state') || sessionStorage.getItem('oauthProvider');
		if (!code || !provider || !['linuxdo', 'github', 'google'].includes(provider)) return;
		sessionStorage.removeItem('oauthProvider');
		history.replaceState({}, '', `${window.location.origin}/login`);
		try {
			const result = await loginOAuth(provider as OAuthProvider, code, `${window.location.origin}/login`);
			if (result.token) { void goto('/inbox'); return; }
			oauthUserId = result.userInfo?.oauthUserId ?? '';
			bindingOAuth = true;
		} catch (error) { notice = error instanceof Error ? error.message : 'OAuth login gagal.'; }
	}

	async function bindAccount(event: SubmitEvent) {
		event.preventDefault();
		try {
			await bindOAuthUser(fullEmail(bindEmail), oauthUserId, bindCode);
			void goto('/inbox');
		} catch (error) { notice = error instanceof Error ? error.message : 'OAuth account could not be bound.'; }
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
				<Button type="button" variant="outline" class="h-10 rounded-lg px-2 text-xs" onclick={() => startOAuth(provider.key)}>{provider.label}</Button>
			{/each}
		</div>
		<div class="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span class="h-px flex-1 bg-border"></span><span>or continue with email</span><span class="h-px flex-1 bg-border"></span></div>
	{/if}

	<form class="mt-7 space-y-5" onsubmit={submit}>
		<label class="block space-y-2 text-[13px] font-medium">
			<span>Email address</span>
			{#if loginDomain}<span class="flex gap-2"><Input bind:value={localPart} type="text" autocomplete="username" required placeholder="name" class="h-11 min-w-0 flex-1 rounded-lg text-sm" /><SelectControl bind:value={domainSuffix} items={normalizedDomains.map((domain) => ({ value: domain, label: `@${domain}` }))} aria-label="Email domain" class="h-11 max-w-[160px] min-w-0 flex-1 text-xs" /></span>{:else}<Input bind:value={email} type="email" autocomplete="email" required placeholder="name@domain.com" class="h-11 rounded-lg text-sm" />{/if}
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
	<p class="mt-3 text-center text-[11px] text-muted-foreground">Sign in with an account configured on the Cloud Mail API.</p>

	<p class="mt-7 text-center text-[13px] text-muted-foreground">
		New to Cloud Mail? <a href="/register" class="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</a>
	</p>
</div>

{#if bindingOAuth}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close account binding" onclick={() => (bindingOAuth = false)}></button>
		<form class="relative z-10 w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-xl" onsubmit={bindAccount}>
			<h2 class="text-sm font-semibold">Bind an email account</h2>
			<p class="text-xs text-muted-foreground">This OAuth identity does not have a Cloud Mail account yet.</p>
			<Input bind:value={bindEmail} type="email" required placeholder="name@domain.com" class="h-10 text-xs" />
			{#if config.regKey === 0 || config.regKey === 2}<Input bind:value={bindCode} required={config.regKey === 0} placeholder="Invite code" class="h-10 text-xs" />{/if}
			<Button type="submit" class="w-full">Bind account</Button>
		</form>
	</div>
{/if}
