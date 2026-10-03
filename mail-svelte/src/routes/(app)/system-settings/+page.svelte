<script lang="ts">
	import { Check, ExternalLink, Image, Save } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { assetUrl, deleteSystemBackground, getSystemSettings, saveSystemBackground, saveSystemBlacklist, saveSystemSettings } from '$lib/api/config.js';
	import { hasPermission } from '$lib/permissions.svelte.js';

	let config = $state({
		title: 'Cloud Mail',
		registration: true,
		loginDomain: false,
		inviteMode: 'Optional',
		allowMailboxAdd: true,
		multiMailbox: true,
		syncDelete: false,
		receiveMail: true,
		autoRefresh: '0',
		sendingEnabled: true,
		noRecipient: false,
		minEmailPrefix: 1,
		emailPrefixFilter: '',
		blackFrom: '',
		blackSubject: '',
		blackContent: '',
		autoCleanDays: 0,
		autoCleanExclude: '',
		resendTokens: '',
		telegramEnabled: false,
		telegramToken: '',
		telegramChatIds: '',
		telegramCustomDomain: '',
		telegramFrom: 'only-name',
		telegramTo: 'show',
		telegramText: 'hide',
		forwardEnabled: false,
		forwardEmails: '',
		forwardRule: 'all',
		forwardRuleEmails: '',
		webhookEnabled: false,
		webhookUrl: '',
		webhookSecret: '',
		webhookRetry: 0,
		storageType: 'R2',
		storageDomain: '',
		s3Bucket: '',
		s3Endpoint: '',
		s3Region: '',
		s3AccessKey: '',
		s3SecretKey: '',
		s3ForcePathStyle: false,
		registerVerifyMode: 'Always',
		registerVerifyCount: 1,
		mailboxVerifyMode: 'Always',
		mailboxVerifyCount: 1,
		secretKey: '',
		announcementEnabled: true,
		announcementTitle: '',
		announcementBody: '',
		announcementPosition: 'top-right',
		announcementDuration: 5000,
		aiCodeEnabled: false,
		aiCodeSenders: '',
		googleClientId: '',
		googleClientSecret: '',
		githubClientId: '',
		githubClientSecret: '',
		linuxDoClientId: '',
		linuxDoClientSecret: '',
		loginOpacity: '0.92',
		loginBackground: '',
		projectLink: true,
		googleOAuth: true,
		githubOAuth: true,
		linuxDoOAuth: false,
		siteKey: '',
		allowDomains: '',
		noticeType: 'info',
		noticeWidth: 400,
		noticeOffset: 0,
		resendTokenDomain: '',
		resendTokenValue: ''
	});
	let showPrefixes = $state(false);
	let saved = $state(false);
	let loading = $state(true);
	let saving = $state(false);
	let settingsError = $state('');
	let originalSettings: Record<string, any> = {};
	let configuredSecrets = $state({ siteKey: false, secretKey: false, telegramToken: false, s3AccessKey: false, s3SecretKey: false, googleClientSecret: false, githubClientSecret: false, linuxDoClientSecret: false });
	let showAnnouncementPreview = $state(false);
	let showBackgroundPreview = $state(false);
	const canEditSettings = $derived(hasPermission('setting:set'));

	onMount(() => { void loadSettings(); });

	function flag(value: unknown) { return Number(value) === 0; }
	function verificationMode(value: unknown) { return ({ 0: 'Always', 1: 'Disabled', 2: 'By count' } as Record<number, string>)[Number(value)] ?? 'Disabled'; }
	function listText(value: unknown) { return Array.isArray(value) ? value.join('\n') : String(value ?? '').replaceAll(',', '\n'); }
	function csv(value: string) { return value.split(/[\n,，]/).map((item) => item.trim()).filter(Boolean).join(','); }
	function secretExists(value: unknown) { return typeof value === 'string' && value.length > 0; }

	function hydrateSettings(value: Record<string, any>) {
		originalSettings = value;
		configuredSecrets = {
			siteKey: secretExists(value.siteKey), secretKey: secretExists(value.secretKey), telegramToken: secretExists(value.tgBotToken),
			s3AccessKey: secretExists(value.s3AccessKey), s3SecretKey: secretExists(value.s3SecretKey),
			googleClientSecret: secretExists(value.googleClientSecret), githubClientSecret: secretExists(value.githubClientSecret), linuxDoClientSecret: secretExists(value.linuxdoClientSecret)
		};
		config = {
			...config,
			title: value.title ?? '', registration: flag(value.register), loginDomain: Number(value.loginDomain) === 1,
			inviteMode: ({ 0: 'Required', 1: 'Disabled', 2: 'Optional' } as Record<number, string>)[Number(value.regKey)] ?? 'Disabled',
			allowMailboxAdd: flag(value.addEmail), multiMailbox: flag(value.manyEmail), syncDelete: flag(value.syncDelete),
			receiveMail: flag(value.receive), autoRefresh: String(value.autoRefresh ?? 0), sendingEnabled: flag(value.send), noRecipient: flag(value.noRecipient),
			minEmailPrefix: Number(value.minEmailPrefix ?? 0), emailPrefixFilter: listText(value.emailPrefixFilter),
			blackFrom: listText(value.blackFrom), blackSubject: listText(value.blackSubject), blackContent: listText(value.blackContent),
			autoCleanDays: Number(value.autoCleanDays ?? 0), autoCleanExclude: listText(value.autoCleanExclude),
			resendTokens: Object.entries(value.resendTokens ?? {}).map(([domain, token]) => `${domain}: ${String(token)}`).join('\n'),
			telegramEnabled: flag(value.tgBotStatus), telegramToken: '', telegramChatIds: listText(value.tgChatId),
			telegramCustomDomain: value.customDomain ?? '', telegramFrom: value.tgMsgFrom || 'only-name', telegramTo: value.tgMsgTo || 'show', telegramText: value.tgMsgText || 'hide',
			forwardEnabled: flag(value.forwardStatus), forwardEmails: listText(value.forwardEmail), forwardRule: Number(value.ruleType) === 1 ? 'rules' : 'all', forwardRuleEmails: listText(value.ruleEmail),
			webhookEnabled: flag(value.webhookStatus), webhookUrl: value.webhookUrl ?? '', webhookSecret: value.webhookSecret ?? '', webhookRetry: Number(value.webhookRetry ?? 0),
			storageType: value.storageType ?? 'R2', storageDomain: value.r2Domain ?? '', s3Bucket: value.bucket ?? '', s3Endpoint: value.endpoint ?? '', s3Region: value.region ?? '',
			s3AccessKey: '', s3SecretKey: '', s3ForcePathStyle: Number(value.forcePathStyle) === 1,
			registerVerifyMode: verificationMode(value.registerVerify), registerVerifyCount: Number(value.regVerifyCount ?? 1),
			mailboxVerifyMode: verificationMode(value.addEmailVerify), mailboxVerifyCount: Number(value.addVerifyCount ?? 1), secretKey: '',
			announcementEnabled: flag(value.notice), announcementTitle: value.noticeTitle ?? '', announcementBody: value.noticeContent ?? '',
			announcementPosition: value.noticePosition || 'top-right', announcementDuration: Number(value.noticeDuration ?? 0),
			aiCodeEnabled: flag(value.aiCode), aiCodeSenders: listText(value.aiCodeFilter),
			googleClientId: value.googleClientId ?? '', googleClientSecret: '', githubClientId: value.githubClientId ?? '', githubClientSecret: '',
			linuxDoClientId: value.linuxdoClientId ?? '', linuxDoClientSecret: '', loginOpacity: String(value.loginOpacity ?? 0.88),
			loginBackground: value.background ?? '', projectLink: value.projectLink !== false, googleOAuth: flag(value.googleSwitch),
			githubOAuth: flag(value.githubSwitch), linuxDoOAuth: flag(value.linuxdoSwitch),
			siteKey: '', allowDomains: (value.domainList ?? []).map((domain: string) => domain.replace(/^@/, '')).join('\n'),
			noticeType: value.noticeType || 'info', noticeWidth: Number(value.noticeWidth ?? 400), noticeOffset: Number(value.noticeOffset ?? 0),
			resendTokenDomain: '', resendTokenValue: ''
		};
	}

	async function loadSettings() {
		loading = true;
		settingsError = '';
		try { hydrateSettings(await getSystemSettings()); }
		catch (error) { settingsError = error instanceof Error ? error.message : 'System settings could not be loaded.'; }
		finally { loading = false; }
	}

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (!canEditSettings) return;
		const background = config.loginBackground.trim();
		const tokenDomain = config.resendTokenDomain.trim().replace(/^@/, '').toLowerCase();
		if (background !== String(originalSettings.background ?? '') && background && !/^https?:\/\//i.test(background)) {
			settingsError = 'Background harus berupa URL gambar atau dikosongkan.';
			return;
		}
		if (config.resendTokenValue.trim() && !tokenDomain) {
			settingsError = 'Domain untuk Resend token wajib diisi.';
			return;
		}
		saving = true;
		saved = false;
		settingsError = '';
		const mode = (value: string) => ({ Always: 0, Disabled: 1, 'By count': 2 } as Record<string, number>)[value] ?? 1;
		const payload: Record<string, unknown> = {
			title: config.title.trim(), register: config.registration ? 0 : 1, loginDomain: config.loginDomain ? 1 : 0,
			regKey: ({ Required: 0, Disabled: 1, Optional: 2 } as Record<string, number>)[config.inviteMode] ?? 2,
			addEmail: config.allowMailboxAdd ? 0 : 1, manyEmail: config.multiMailbox ? 0 : 1, syncDelete: config.syncDelete ? 0 : 1,
			receive: config.receiveMail ? 0 : 1, autoRefresh: Number(config.autoRefresh), send: config.sendingEnabled ? 0 : 1,
			noRecipient: config.noRecipient ? 0 : 1, minEmailPrefix: Number(config.minEmailPrefix), emailPrefixFilter: csv(config.emailPrefixFilter),
			autoCleanDays: Number(config.autoCleanDays), autoCleanExclude: csv(config.autoCleanExclude),
			tgBotStatus: config.telegramEnabled ? 0 : 1, tgChatId: csv(config.telegramChatIds), customDomain: config.telegramCustomDomain.trim(),
			tgMsgFrom: config.telegramFrom, tgMsgTo: config.telegramTo, tgMsgText: config.telegramText,
			forwardStatus: config.forwardEnabled ? 0 : 1, forwardEmail: csv(config.forwardEmails), ruleType: config.forwardRule === 'rules' ? 1 : 0,
			ruleEmail: csv(config.forwardRuleEmails), webhookStatus: config.webhookEnabled ? 0 : 1, webhookUrl: config.webhookUrl.trim(),
			webhookRetry: Math.max(0, Math.min(5, Number(config.webhookRetry) || 0)), webhookSecret: config.webhookSecret.trim(),
			r2Domain: config.storageDomain.trim(), bucket: config.s3Bucket.trim(), endpoint: config.s3Endpoint.trim(), region: config.s3Region.trim(),
			forcePathStyle: config.s3ForcePathStyle ? 1 : 0, registerVerify: mode(config.registerVerifyMode), regVerifyCount: Number(config.registerVerifyCount),
			addEmailVerify: mode(config.mailboxVerifyMode), addVerifyCount: Number(config.mailboxVerifyCount), notice: config.announcementEnabled ? 0 : 1,
			noticeTitle: config.announcementTitle, noticeContent: config.announcementBody, noticeType: config.noticeType,
			noticeDuration: Number(config.announcementDuration), noticePosition: config.announcementPosition, noticeWidth: Number(config.noticeWidth), noticeOffset: Number(config.noticeOffset),
			aiCode: config.aiCodeEnabled ? 0 : 1, aiCodeFilter: csv(config.aiCodeSenders),
			googleSwitch: config.googleOAuth ? 0 : 1, googleClientId: config.googleClientId.trim(),
			githubSwitch: config.githubOAuth ? 0 : 1, githubClientId: config.githubClientId.trim(),
			linuxdoSwitch: config.linuxDoOAuth ? 0 : 1, linuxdoClientId: config.linuxDoClientId.trim(),
			loginOpacity: Math.max(0, Math.min(1, Number(config.loginOpacity) || 0.88))
		};
		for (const [field, value] of Object.entries({
			tgBotToken: config.telegramToken.trim(), s3AccessKey: config.s3AccessKey.trim(), s3SecretKey: config.s3SecretKey.trim(),
			siteKey: config.siteKey.trim(), secretKey: config.secretKey.trim(), googleClientSecret: config.googleClientSecret.trim(),
			githubClientSecret: config.githubClientSecret.trim(), linuxdoClientSecret: config.linuxDoClientSecret.trim()
		})) if (value) payload[field] = value;

		try {
			await saveSystemSettings(payload);
			await saveSystemBlacklist({ blackFrom: csv(config.blackFrom), blackSubject: csv(config.blackSubject), blackContent: csv(config.blackContent) });
			if (background !== String(originalSettings.background ?? '')) {
				if (!background) await deleteSystemBackground();
				else if (/^https?:\/\//i.test(background)) await saveSystemBackground(background);
			}
			if (config.resendTokenValue.trim()) {
				await saveSystemSettings({ resendTokens: { [tokenDomain]: config.resendTokenValue.trim() } });
			}
			hydrateSettings(await getSystemSettings());
			saved = true;
		} catch (error) { settingsError = error instanceof Error ? error.message : 'System settings could not be saved.'; }
		finally { saving = false; }
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">System settings</h1><p class="mt-1 text-[13px] text-muted-foreground">Configure registration, mail behavior, and workspace defaults.</p></div>
			<div class="flex items-center gap-2"><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">Admin</Badge><Button type="submit" form="system-settings-form" size="sm" class="rounded-full" disabled={loading || saving || !canEditSettings}><Save data-icon="inline-start" />Save settings</Button></div>
		</div>

		<form id="system-settings-form" class="mt-5" onsubmit={saveSettings}>
			{#if loading}
				<p role="status" class="rounded-xl border bg-card p-5 text-xs text-muted-foreground">Loading settings from the API…</p>
			{:else if !Object.keys(originalSettings).length}
				<div class="rounded-xl border bg-card p-5"><p role="alert" class="text-xs text-destructive">{settingsError || 'No settings were returned by the API.'}</p><Button type="button" variant="outline" size="sm" class="mt-4 rounded-full" onclick={loadSettings}>Retry</Button></div>
			{:else}
				{#if settingsError}<p role="alert" class="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">{settingsError}</p>{/if}
				{#if !canEditSettings}<p class="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">You can view system settings, but your role does not allow changes.</p>{/if}
				<fieldset disabled={!canEditSettings} class="contents">
			<div class="grid gap-4 xl:grid-cols-2">
				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Website and registration</h2><p class="mt-1 text-[10px] text-muted-foreground">Control who can sign in and create accounts.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Public registration</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow visitors to create an account.</span></span><Switch bind:checked={config.registration} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Hide sign-in domain</span><span class="mt-1 block text-[9px] text-muted-foreground">Hide the configured domain suffix from the public sign-in form.</span></span><Switch bind:checked={config.loginDomain} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Mailbox creation</span><span class="mt-1 block text-[9px] text-muted-foreground">Let users add mailboxes to their workspace.</span></span><Switch bind:checked={config.allowMailboxAdd} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Multiple mailboxes</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow more than one mailbox per user.</span></span><Switch bind:checked={config.multiMailbox} /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Invite code policy</span><SelectControl bind:value={config.inviteMode} items={[{"value": "Disabled", "label": "Disabled"}, {"value": "Required", "label": "Required"}, {"value": "Optional", "label": "Optional"}]} class="h-9 w-full text-xs" /></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Mail behavior</h2><p class="mt-1 text-[10px] text-muted-foreground">Set defaults for receiving, refresh, and outbound mail.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Receive mail</span><span class="mt-1 block text-[9px] text-muted-foreground">Enable incoming mailbox sync.</span></span><Switch bind:checked={config.receiveMail} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Sync deletions</span><span class="mt-1 block text-[9px] text-muted-foreground">Apply deletions to the connected source mailbox.</span></span><Switch bind:checked={config.syncDelete} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Outbound email</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow users to send email through Resend.</span></span><Switch bind:checked={config.sendingEnabled} /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Inbox auto-refresh</span><SelectControl bind:value={config.autoRefresh} items={[{"value": "0", "label": "Off"}, {"value": "3", "label": "3 seconds"}, {"value": "5", "label": "5 seconds"}, {"value": "10", "label": "10 seconds"}, {"value": "15", "label": "15 seconds"}, {"value": "20", "label": "20 seconds"}]} class="h-9 w-full text-xs" /></label>
					<div class="mt-3"><Button type="button" variant="outline" size="sm" class="rounded-full" onclick={() => (showPrefixes = true)}>Configure email prefixes</Button></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Workspace appearance</h2><p class="mt-1 text-[10px] text-muted-foreground">Customize the name and sign-in screen.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="space-y-1.5 text-[10px] font-medium"><span>Workspace title</span><Input bind:value={config.title} class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium"><span>Sign-in panel opacity</span><Input bind:value={config.loginOpacity} type="number" min="0" max="1" step="0.01" class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium sm:col-span-2"><span>Sign-in background image URL</span><span class="flex gap-2"><Input bind:value={config.loginBackground} placeholder="https://…" class="h-9 text-xs" /><Button type="button" variant="outline" size="icon-sm" aria-label="Preview sign-in background" onclick={() => (showBackgroundPreview = true)}><Image data-icon="inline-start" /></Button></span></label>
					</div>
					<p class="mt-4 flex items-center justify-between gap-4 border-t pt-3 text-[10px]"><span>Project link on sign-in</span><Badge variant="secondary">{config.projectLink ? 'Enabled by environment' : 'Disabled by environment'}</Badge></p>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Sign-in providers and verification</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose available OAuth providers and bot verification.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between py-3 text-[11px]">Google OAuth<Switch bind:checked={config.googleOAuth} /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">GitHub OAuth<Switch bind:checked={config.githubOAuth} /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">Linux DO OAuth<Switch bind:checked={config.linuxDoOAuth} /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Turnstile site key</span><Input bind:value={config.siteKey} class="h-9 text-xs" placeholder={configuredSecrets.siteKey ? 'Configured — enter a new key to replace' : 'Site key'} /></label>
					<p class="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground"><ExternalLink size={11} /> OAuth and Turnstile credentials are stored by the API.</p>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Domain and sender rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Restrict registration and filter blocked senders.</p><Separator class="my-4" />
					<label class="block max-w-xl space-y-1.5 text-[10px] font-medium"><span>Allowed domains</span><textarea bind:value={config.allowDomains} readonly rows="3" class="w-full rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground outline-none"></textarea><span class="block text-[9px] font-normal text-muted-foreground">These domains come from the Worker environment and are read-only here.</span></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Mail filters and cleanup</h2><p class="mt-1 text-[10px] text-muted-foreground">Rules for the local inbox and stored messages.</p><Separator class="my-4" />
					<label class="flex items-center justify-between gap-4 text-[11px]">Allow sending without recipients<Switch bind:checked={config.noRecipient} /></label>
					<div class="mt-4 grid gap-3 sm:grid-cols-3"><label class="space-y-1 text-[10px]">Block sender addresses<textarea bind:value={config.blackFrom} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px]">Block subjects containing<textarea bind:value={config.blackSubject} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px]">Block body text containing<textarea bind:value={config.blackContent} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Auto-clean after days (0 = off)<Input bind:value={config.autoCleanDays} type="number" min="0" max="3650" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Mailboxes excluded from cleanup<textarea bind:value={config.autoCleanExclude} rows="2" placeholder="One address per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<div class="mt-3 space-y-2 text-[10px]"><span class="block font-medium">Configured Resend tokens</span><pre class="max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-[9px]">{config.resendTokens || 'No domain tokens configured.'}</pre><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.resendTokenDomain} placeholder="Domain (example.com)" class="h-9 text-xs" /><Input bind:value={config.resendTokenValue} type="password" placeholder="New token" class="h-9 text-xs" /></div><span class="block text-[9px] text-muted-foreground">Blank token keeps existing credentials. A new token replaces that domain's token when you save.</span></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Push and forwarding</h2><p class="mt-1 text-[10px] text-muted-foreground">Configure delivery notifications and forwarding on the Worker.</p><Separator class="my-4" />
					<div class="grid gap-5 md:grid-cols-3">
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Telegram bot<Switch bind:checked={config.telegramEnabled} /></label><Input bind:value={config.telegramToken} type="password" placeholder={configuredSecrets.telegramToken ? 'Configured — enter a new token to replace' : 'Bot token'} class="h-9 text-xs" /><textarea bind:value={config.telegramChatIds} rows="2" placeholder="Chat IDs, one per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea><Input bind:value={config.telegramCustomDomain} placeholder="Public domain for links (optional)" class="h-9 text-xs" /><SelectControl bind:value={config.telegramFrom} items={[{"value": "show", "label": "Show sender email"}, {"value": "hide", "label": "Hide sender"}, {"value": "only-name", "label": "Sender name only"}]} aria-label="Telegram sender display" class="h-9 w-full text-xs" /><div class="grid grid-cols-2 gap-2"><SelectControl bind:value={config.telegramTo} items={[{"value": "show", "label": "Show recipients"}, {"value": "hide", "label": "Hide recipients"}]} aria-label="Telegram recipient display" class="h-9 text-xs" /><SelectControl bind:value={config.telegramText} items={[{"value": "show", "label": "Show message text"}, {"value": "hide", "label": "Hide message text"}]} aria-label="Telegram message text" class="h-9 text-xs" /></div></div>
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Email forwarding<Switch bind:checked={config.forwardEnabled} /></label><textarea bind:value={config.forwardEmails} rows="2" placeholder="Destination emails" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea><SelectControl bind:value={config.forwardRule} items={[{"value": "all", "label": "Forward all"}, {"value": "rules", "label": "Match rules"}]} aria-label="Forwarding rule" class="h-9 w-full text-xs" /><textarea bind:value={config.forwardRuleEmails} rows="2" placeholder="Rule addresses" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></div>
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Webhook<Switch bind:checked={config.webhookEnabled} /></label><Input bind:value={config.webhookUrl} type="url" placeholder="Webhook URL" class="h-9 text-xs" /><Input bind:value={config.webhookSecret} type="password" placeholder="Webhook secret" class="h-9 text-xs" /><label class="block text-[10px]">Retries<Input bind:value={config.webhookRetry} type="number" min="0" max="5" class="mt-1 h-9 text-xs" /></label><details class="text-[10px] text-muted-foreground"><summary class="cursor-pointer">Payload format</summary><pre class="mt-2 overflow-x-auto rounded-lg bg-muted p-2">{`Content-Type: application/json\nAuthorization: <secret>\n{ "event": "mail.received", "messageId": "..." }`}</pre></details></div>
					</div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Object storage</h2><p class="mt-1 text-[10px] text-muted-foreground">Storage configuration returned by the Worker.</p><Separator class="my-4" />
					<div class="mb-3 flex items-center justify-between text-[10px]"><span>Storage type</span><Badge variant="secondary">{config.storageType}</Badge></div><div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Public storage domain<Input bind:value={config.storageDomain} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Bucket<Input bind:value={config.s3Bucket} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Endpoint<Input bind:value={config.s3Endpoint} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Region<Input bind:value={config.s3Region} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Access key<Input bind:value={config.s3AccessKey} type="password" placeholder={configuredSecrets.s3AccessKey ? 'Configured — enter to replace' : 'Access key'} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] sm:col-span-2">Secret key<Input bind:value={config.s3SecretKey} type="password" placeholder={configuredSecrets.s3SecretKey ? 'Configured — enter to replace' : 'Secret key'} class="h-9 text-xs" /></label></div><label class="mt-3 flex items-center gap-2 text-[10px]"><Switch bind:checked={config.s3ForcePathStyle} />Force path style</label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Verification rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose when the Worker requires bot verification.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Sign-up verification<SelectControl bind:value={config.registerVerifyMode} items={[{"value": "Always", "label": "Always"}, {"value": "Disabled", "label": "Disabled"}, {"value": "By count", "label": "By count"}]} class="h-9 w-full text-xs" /></label><label class="space-y-1 text-[10px]">After sign-ups<Input bind:value={config.registerVerifyCount} type="number" min="1" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Mailbox verification<SelectControl bind:value={config.mailboxVerifyMode} items={[{"value": "Always", "label": "Always"}, {"value": "Disabled", "label": "Disabled"}, {"value": "By count", "label": "By count"}]} class="h-9 w-full text-xs" /></label><label class="space-y-1 text-[10px]">After additions<Input bind:value={config.mailboxVerifyCount} type="number" min="1" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] sm:col-span-2">Turnstile secret key<Input bind:value={config.secretKey} type="password" placeholder={configuredSecrets.secretKey ? 'Configured — enter a new key to replace' : 'Secret key'} class="h-9 text-xs" /></label></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Announcements and code recognition</h2><Separator class="my-4" />
					<label class="flex items-center justify-between text-[10px]">Show announcement<Switch bind:checked={config.announcementEnabled} /></label><div class="mt-3 space-y-2"><Input bind:value={config.announcementTitle} placeholder="Title" class="h-9 text-xs" /><textarea bind:value={config.announcementBody} rows="3" placeholder="Announcement text" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea><div class="grid grid-cols-2 gap-2"><SelectControl bind:value={config.noticeType} items={[{"value": "none", "label": "No icon"}, {"value": "primary", "label": "Primary"}, {"value": "success", "label": "Success"}, {"value": "warning", "label": "Warning"}, {"value": "info", "label": "Info"}]} aria-label="Announcement style" class="h-9 text-xs" /><SelectControl bind:value={config.announcementPosition} items={[{"value": "top-left", "label": "Top left"}, {"value": "top-right", "label": "Top right"}, {"value": "bottom-left", "label": "Bottom left"}, {"value": "bottom-right", "label": "Bottom right"}]} aria-label="Announcement position" class="h-9 text-xs" /><Input bind:value={config.announcementDuration} type="number" min="0" placeholder="Duration (ms)" class="h-9 text-xs" /><Input bind:value={config.noticeWidth} type="number" min="0" placeholder="Width (px)" class="h-9 text-xs" /><Input bind:value={config.noticeOffset} type="number" min="0" placeholder="Offset (px)" class="h-9 text-xs" /></div><Button type="button" variant="outline" size="sm" onclick={() => (showAnnouncementPreview = true)}>Preview announcement</Button></div><Separator class="my-4" /><label class="flex items-center justify-between text-[10px]">Recognize verification codes<Switch bind:checked={config.aiCodeEnabled} /></label><textarea bind:value={config.aiCodeSenders} rows="2" placeholder="Allowed sender rules, one per line" class="mt-2 w-full rounded-lg border bg-background p-2 text-xs"></textarea>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">OAuth credentials</h2><p class="mt-1 text-[10px] text-muted-foreground">Client IDs and secrets are stored by the API. Empty secret fields keep the saved value.</p><Separator class="my-4" /><div class="space-y-3"><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.googleClientId} placeholder="Google client ID" class="h-9 text-xs" /><Input bind:value={config.googleClientSecret} type="password" placeholder={configuredSecrets.googleClientSecret ? 'Configured — enter to replace' : 'Google client secret'} class="h-9 text-xs" /></div><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.githubClientId} placeholder="GitHub client ID" class="h-9 text-xs" /><Input bind:value={config.githubClientSecret} type="password" placeholder={configuredSecrets.githubClientSecret ? 'Configured — enter to replace' : 'GitHub client secret'} class="h-9 text-xs" /></div><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.linuxDoClientId} placeholder="Linux DO client ID" class="h-9 text-xs" /><Input bind:value={config.linuxDoClientSecret} type="password" placeholder={configuredSecrets.linuxDoClientSecret ? 'Configured — enter to replace' : 'Linux DO client secret'} class="h-9 text-xs" /></div></div>
				</section>
			</div>
			<div class="mt-4 flex items-center justify-end gap-3"><span role="status" class="text-[10px] text-muted-foreground">{#if saved}<Check size={12} class="mr-1 inline" />Saved to API{/if}</span><Button type="submit" size="sm" class="rounded-full" disabled={saving || !canEditSettings}><Save data-icon="inline-start" />{saving ? 'Saving…' : 'Save settings'}</Button></div>
				</fieldset>
			{/if}
		</form>
	</div>
</section>

{#if showPrefixes}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close email prefix settings" onclick={() => (showPrefixes = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="prefix-title" class="relative z-10 w-full max-w-[420px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="prefix-title" class="text-sm font-semibold">Email prefix rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Set the minimum local-part length and text fragments that are forbidden by the Worker.</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Minimum prefix length<Input bind:value={config.minEmailPrefix} type="number" min="0" max="64" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Forbidden text fragments<textarea bind:value={config.emailPrefixFilter} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
			<div class="mt-5 flex justify-end"><Button size="sm" class="rounded-full" onclick={() => (showPrefixes = false)}>Done</Button></div>
		</div>
	</div>
{/if}

{#if showBackgroundPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close background preview" onclick={() => (showBackgroundPreview = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="background-preview-title" class="relative z-10 w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-xl"><div class="flex items-center justify-between px-4 py-3"><h2 id="background-preview-title" class="text-xs font-semibold">Sign-in background preview</h2><Button variant="ghost" size="xs" onclick={() => (showBackgroundPreview = false)}>Close</Button></div>{#if config.loginBackground}<img src={assetUrl(config.loginBackground, config.storageDomain)} alt="Configured sign-in background" class="max-h-[60svh] w-full object-cover" />{:else}<p class="p-8 text-center text-xs text-muted-foreground">No sign-in background is configured.</p>{/if}</div>
	</div>
{/if}

{#if showAnnouncementPreview}
	<div class="fixed inset-0 z-50 flex items-start justify-end p-5" role="presentation">
		<button class="absolute inset-0 bg-foreground/10" aria-label="Close announcement preview" onclick={() => (showAnnouncementPreview = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="preview-announcement-title" class="relative z-10 w-full max-w-[360px] rounded-xl border bg-background p-4 shadow-xl">
			<h2 id="preview-announcement-title" class="text-sm font-semibold">{config.announcementTitle}</h2><p class="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{config.announcementBody}</p><Button variant="outline" size="sm" class="mt-4" onclick={() => (showAnnouncementPreview = false)}>Close</Button>
		</div>
	</div>
{/if}
