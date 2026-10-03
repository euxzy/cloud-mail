<script lang="ts">
	import { Check, ExternalLink, Image, Save } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';

	let config = $state({
		title: 'Cloud Mail',
		registration: true,
		loginDomain: false,
		inviteMode: 'Optional',
		allowMailboxAdd: true,
		multiMailbox: true,
		syncDelete: false,
		receiveMail: true,
		autoRefresh: '15 minutes',
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
		forwardEnabled: false,
		forwardEmails: '',
		forwardRule: 'all',
		forwardRuleEmails: '',
		webhookEnabled: false,
		webhookUrl: '',
		webhookSecret: '',
		webhookRetry: 0,
		storageType: 'Local preview',
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
		announcementTitle: 'Welcome to the new Cloud Mail workspace',
		announcementBody: 'Your mailbox, delivery tools, and account settings are coming together in one place.',
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
		turnstile: true,
		siteKey: '',
		allowDomains: 'cloudmail.id\nexample.com',
		blockedAddresses: ''
	});
	let showPrefixes = $state(false);
	let emailPrefixes = $state(['notifications', 'support', 'hello']);
	let prefixInput = $state('');
	let saved = $state(false);
	let showAnnouncementPreview = $state(false);
	let showBackgroundPreview = $state(false);

	onMount(() => {
		const stored = localStorage.getItem('cloud-mail-system-settings-preview');
		if (!stored) return;
		try {
			const values = JSON.parse(stored) as Partial<typeof config> & { emailPrefixes?: string[] };
			const { emailPrefixes: storedPrefixes, ...storedConfig } = values;
			config = { ...config, ...storedConfig };
			if (Array.isArray(storedPrefixes)) emailPrefixes = storedPrefixes;
		} catch {
			localStorage.removeItem('cloud-mail-system-settings-preview');
		}
	});

	function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		localStorage.setItem('cloud-mail-system-settings-preview', JSON.stringify({ ...config, emailPrefixes }));
		saved = true;
	}

	function addPrefix() {
		const prefix = prefixInput.trim().replace(/^@/, '');
		if (prefix && !emailPrefixes.includes(prefix)) emailPrefixes = [...emailPrefixes, prefix];
		prefixInput = '';
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">System settings</h1><p class="mt-1 text-[13px] text-muted-foreground">Configure registration, mail behavior, and workspace defaults.</p></div>
			<div class="flex items-center gap-2"><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">Admin</Badge><Button type="submit" form="system-settings-form" size="sm" class="rounded-full"><Save data-icon="inline-start" />Save settings</Button></div>
		</div>

		<form id="system-settings-form" class="mt-5" onsubmit={saveSettings}>
			<div class="grid gap-4 xl:grid-cols-2">
				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Website and registration</h2><p class="mt-1 text-[10px] text-muted-foreground">Control who can sign in and create accounts.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Public registration</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow visitors to create an account.</span></span><Switch bind:checked={config.registration} /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Require email domain</span><span class="mt-1 block text-[9px] text-muted-foreground">Use a configured domain suffix on the sign-in form.</span></span><Switch bind:checked={config.loginDomain} /></label>
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
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Inbox auto-refresh</span><SelectControl bind:value={config.autoRefresh} items={[{"value": "Off", "label": "Off"}, {"value": "5 minutes", "label": "5 minutes"}, {"value": "15 minutes", "label": "15 minutes"}, {"value": "30 minutes", "label": "30 minutes"}, {"value": "60 minutes", "label": "60 minutes"}]} class="h-9 w-full text-xs" /></label>
					<div class="mt-3"><Button type="button" variant="outline" size="sm" class="rounded-full" onclick={() => (showPrefixes = true)}>Configure email prefixes</Button></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Workspace appearance</h2><p class="mt-1 text-[10px] text-muted-foreground">Customize the name and sign-in screen.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="space-y-1.5 text-[10px] font-medium"><span>Workspace title</span><Input bind:value={config.title} class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium"><span>Sign-in panel opacity</span><Input bind:value={config.loginOpacity} type="number" min="0" max="1" step="0.01" class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium sm:col-span-2"><span>Sign-in background image URL</span><span class="flex gap-2"><Input bind:value={config.loginBackground} placeholder="https://…" class="h-9 text-xs" /><Button type="button" variant="outline" size="icon-sm" aria-label="Preview sign-in background" onclick={() => (showBackgroundPreview = true)}><Image data-icon="inline-start" /></Button></span></label>
					</div>
					<label class="mt-4 flex items-center justify-between gap-4 border-t pt-3"><span><span class="block text-[11px] font-medium">Show project link</span><span class="mt-1 block text-[9px] text-muted-foreground">Display a link to the project repository on sign-in.</span></span><Switch bind:checked={config.projectLink} /></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Sign-in providers and verification</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose available OAuth providers and bot verification.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between py-3 text-[11px]">Google OAuth<Switch bind:checked={config.googleOAuth} /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">GitHub OAuth<Switch bind:checked={config.githubOAuth} /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">Linux DO OAuth<Switch bind:checked={config.linuxDoOAuth} /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">Cloudflare Turnstile<Switch bind:checked={config.turnstile} /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Turnstile site key</span><Input bind:value={config.siteKey} class="h-9 text-xs" placeholder="Site key" /></label>
					<p class="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground"><ExternalLink size={11} /> OAuth credentials are managed in environment configuration.</p>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Domain and sender rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Restrict registration and filter blocked senders.</p><Separator class="my-4" />
					<div class="grid gap-4 sm:grid-cols-2"><label class="space-y-1.5 text-[10px] font-medium"><span>Allowed domains</span><textarea bind:value={config.allowDomains} rows="5" class="w-full rounded-lg border bg-background p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea><span class="block text-[9px] font-normal text-muted-foreground">One domain per line.</span></label><label class="space-y-1.5 text-[10px] font-medium"><span>Blocked addresses and domains</span><textarea bind:value={config.blockedAddresses} rows="5" class="w-full rounded-lg border bg-background p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="spam@example.com"></textarea><span class="block text-[9px] font-normal text-muted-foreground">Use an email address, domain, or * to block all.</span></label></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Mail filters and cleanup</h2><p class="mt-1 text-[10px] text-muted-foreground">Rules for the local inbox and stored messages.</p><Separator class="my-4" />
					<label class="flex items-center justify-between gap-4 text-[11px]">Allow sending without recipients<Switch bind:checked={config.noRecipient} /></label>
					<div class="mt-4 grid gap-3 sm:grid-cols-3"><label class="space-y-1 text-[10px]">Block sender addresses<textarea bind:value={config.blackFrom} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px]">Block subjects containing<textarea bind:value={config.blackSubject} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px]">Block body text containing<textarea bind:value={config.blackContent} rows="3" placeholder="One per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Auto-clean after days (0 = off)<Input bind:value={config.autoCleanDays} type="number" min="0" max="3650" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Mailboxes excluded from cleanup<textarea bind:value={config.autoCleanExclude} rows="2" placeholder="One address per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<label class="mt-3 block space-y-1 text-[10px]">Resend tokens by domain<textarea bind:value={config.resendTokens} rows="2" placeholder="domain.com: token" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Push and forwarding</h2><p class="mt-1 text-[10px] text-muted-foreground">Save channel preferences for this local workspace.</p><Separator class="my-4" />
					<div class="grid gap-5 md:grid-cols-3">
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Telegram bot<Switch bind:checked={config.telegramEnabled} /></label><Input bind:value={config.telegramToken} type="password" placeholder="Bot token" class="h-9 text-xs" /><textarea bind:value={config.telegramChatIds} rows="2" placeholder="Chat IDs, one per line" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></div>
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Email forwarding<Switch bind:checked={config.forwardEnabled} /></label><textarea bind:value={config.forwardEmails} rows="2" placeholder="Destination emails" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea><SelectControl bind:value={config.forwardRule} items={[{"value": "all", "label": "Forward all"}, {"value": "rules", "label": "Match rules"}]} aria-label="Forwarding rule" class="h-9 w-full text-xs" /><textarea bind:value={config.forwardRuleEmails} rows="2" placeholder="Rule addresses" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></div>
						<div class="space-y-2"><label class="flex items-center justify-between text-[10px] font-medium">Webhook<Switch bind:checked={config.webhookEnabled} /></label><Input bind:value={config.webhookUrl} type="url" placeholder="Webhook URL" class="h-9 text-xs" /><Input bind:value={config.webhookSecret} type="password" placeholder="Webhook secret" class="h-9 text-xs" /><label class="block text-[10px]">Retries<Input bind:value={config.webhookRetry} type="number" min="0" max="5" class="mt-1 h-9 text-xs" /></label><details class="text-[10px] text-muted-foreground"><summary class="cursor-pointer">Payload format</summary><pre class="mt-2 overflow-x-auto rounded-lg bg-muted p-2">{`Content-Type: application/json\nAuthorization: <secret>\n{ "event": "mail.received", "messageId": "..." }`}</pre></details></div>
					</div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Object storage</h2><p class="mt-1 text-[10px] text-muted-foreground">Storage fields from the Vue workspace.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Storage type<SelectControl bind:value={config.storageType} items={[{"value": "Local preview", "label": "Local preview"}, {"value": "S3", "label": "S3"}, {"value": "R2", "label": "R2"}]} class="h-9 w-full text-xs" /></label><label class="space-y-1 text-[10px]">Public storage domain<Input bind:value={config.storageDomain} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Bucket<Input bind:value={config.s3Bucket} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Endpoint<Input bind:value={config.s3Endpoint} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Region<Input bind:value={config.s3Region} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Access key<Input bind:value={config.s3AccessKey} type="password" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] sm:col-span-2">Secret key<Input bind:value={config.s3SecretKey} type="password" class="h-9 text-xs" /></label></div><label class="mt-3 flex items-center gap-2 text-[10px]"><Switch bind:checked={config.s3ForcePathStyle} />Force path style</label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Verification rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose when local verification appears.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Sign-up verification<SelectControl bind:value={config.registerVerifyMode} items={[{"value": "Always", "label": "Always"}, {"value": "Disabled", "label": "Disabled"}, {"value": "By count", "label": "By count"}]} class="h-9 w-full text-xs" /></label><label class="space-y-1 text-[10px]">After sign-ups<Input bind:value={config.registerVerifyCount} type="number" min="1" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Mailbox verification<SelectControl bind:value={config.mailboxVerifyMode} items={[{"value": "Always", "label": "Always"}, {"value": "Disabled", "label": "Disabled"}, {"value": "By count", "label": "By count"}]} class="h-9 w-full text-xs" /></label><label class="space-y-1 text-[10px]">After additions<Input bind:value={config.mailboxVerifyCount} type="number" min="1" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] sm:col-span-2">Turnstile secret key<Input bind:value={config.secretKey} type="password" class="h-9 text-xs" /></label></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Announcements and code recognition</h2><Separator class="my-4" />
					<label class="flex items-center justify-between text-[10px]">Show announcement<Switch bind:checked={config.announcementEnabled} /></label><div class="mt-3 space-y-2"><Input bind:value={config.announcementTitle} placeholder="Title" class="h-9 text-xs" /><textarea bind:value={config.announcementBody} rows="3" placeholder="Announcement text" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea><div class="grid grid-cols-2 gap-2"><SelectControl bind:value={config.announcementPosition} items={[{"value": "top-left", "label": "Top left"}, {"value": "top-right", "label": "Top right"}, {"value": "bottom-left", "label": "Bottom left"}, {"value": "bottom-right", "label": "Bottom right"}]} aria-label="Announcement position" class="h-9 text-xs" /><Input bind:value={config.announcementDuration} type="number" min="0" placeholder="Duration (ms)" class="h-9 text-xs" /></div><Button type="button" variant="outline" size="sm" onclick={() => (showAnnouncementPreview = true)}>Preview announcement</Button></div><Separator class="my-4" /><label class="flex items-center justify-between text-[10px]">Recognize verification codes<Switch bind:checked={config.aiCodeEnabled} /></label><textarea bind:value={config.aiCodeSenders} rows="2" placeholder="Allowed sender rules, one per line" class="mt-2 w-full rounded-lg border bg-background p-2 text-xs"></textarea>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">OAuth credentials</h2><p class="mt-1 text-[10px] text-muted-foreground">Provider fields for local configuration only.</p><Separator class="my-4" /><div class="space-y-3"><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.googleClientId} placeholder="Google client ID" class="h-9 text-xs" /><Input bind:value={config.googleClientSecret} type="password" placeholder="Google client secret" class="h-9 text-xs" /></div><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.githubClientId} placeholder="GitHub client ID" class="h-9 text-xs" /><Input bind:value={config.githubClientSecret} type="password" placeholder="GitHub client secret" class="h-9 text-xs" /></div><div class="grid gap-2 sm:grid-cols-2"><Input bind:value={config.linuxDoClientId} placeholder="Linux DO client ID" class="h-9 text-xs" /><Input bind:value={config.linuxDoClientSecret} type="password" placeholder="Linux DO client secret" class="h-9 text-xs" /></div></div>
				</section>
			</div>
			<div class="mt-4 flex items-center justify-end gap-3"><span role="status" class="text-[10px] text-muted-foreground">{#if saved}<Check size={12} class="mr-1 inline" />Saved in this preview{/if}</span><Button type="submit" size="sm" class="rounded-full"><Save data-icon="inline-start" />Save settings</Button></div>
		</form>
	</div>
</section>

{#if showPrefixes}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close email prefix settings" onclick={() => (showPrefixes = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="prefix-title" class="relative z-10 w-full max-w-[420px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="prefix-title" class="text-sm font-semibold">Email prefixes</h2><p class="mt-1 text-[10px] text-muted-foreground">Allowed local parts for generated email addresses.</p>
			<div class="mt-4 flex gap-2"><Input bind:value={prefixInput} placeholder="Add a prefix" class="h-9 text-xs" /><Button size="sm" class="rounded-full" onclick={addPrefix}>Add</Button></div>
			<div class="mt-3 grid gap-2 sm:grid-cols-2"><label class="space-y-1 text-[10px]">Minimum prefix length<Input bind:value={config.minEmailPrefix} type="number" min="1" max="20" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Forbidden text<Input bind:value={config.emailPrefixFilter} placeholder="Comma-separated" class="h-9 text-xs" /></label></div>
			<div class="mt-3 flex flex-wrap gap-2">{#each emailPrefixes as prefix (prefix)}<Badge variant="secondary" class="gap-2 rounded-full px-2.5 py-1 text-[10px]">{prefix}<button type="button" aria-label={`Remove ${prefix}`} onclick={() => (emailPrefixes = emailPrefixes.filter((item) => item !== prefix))}>×</button></Badge>{/each}</div>
			<div class="mt-5 flex justify-end"><Button size="sm" class="rounded-full" onclick={() => (showPrefixes = false)}>Done</Button></div>
		</div>
	</div>
{/if}

{#if showBackgroundPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close background preview" onclick={() => (showBackgroundPreview = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="background-preview-title" class="relative z-10 w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-xl"><div class="flex items-center justify-between px-4 py-3"><h2 id="background-preview-title" class="text-xs font-semibold">Sign-in background preview</h2><Button variant="ghost" size="xs" onclick={() => (showBackgroundPreview = false)}>Close</Button></div>{#if /^https?:\/\//.test(config.loginBackground)}<img src={config.loginBackground} alt="Configured sign-in background" class="max-h-[60svh] w-full object-cover" />{:else}<p class="p-8 text-center text-xs text-muted-foreground">Enter an image URL to preview it.</p>{/if}</div>
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
