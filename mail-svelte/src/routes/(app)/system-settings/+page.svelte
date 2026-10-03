<script lang="ts">
	import { Check, ExternalLink, Image, Save } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

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
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Public registration</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow visitors to create an account.</span></span><input bind:checked={config.registration} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Require email domain</span><span class="mt-1 block text-[9px] text-muted-foreground">Use a configured domain suffix on the sign-in form.</span></span><input bind:checked={config.loginDomain} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Mailbox creation</span><span class="mt-1 block text-[9px] text-muted-foreground">Let users add mailboxes to their workspace.</span></span><input bind:checked={config.allowMailboxAdd} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Multiple mailboxes</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow more than one mailbox per user.</span></span><input bind:checked={config.multiMailbox} type="checkbox" class="size-4 accent-primary" /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Invite code policy</span><select bind:value={config.inviteMode} class="h-9 w-full rounded-lg border bg-background px-3 text-xs"><option>Disabled</option><option>Required</option><option>Optional</option></select></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Mail behavior</h2><p class="mt-1 text-[10px] text-muted-foreground">Set defaults for receiving, refresh, and outbound mail.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Receive mail</span><span class="mt-1 block text-[9px] text-muted-foreground">Enable incoming mailbox sync.</span></span><input bind:checked={config.receiveMail} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Sync deletions</span><span class="mt-1 block text-[9px] text-muted-foreground">Apply deletions to the connected source mailbox.</span></span><input bind:checked={config.syncDelete} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between gap-4 py-3"><span><span class="block text-[11px] font-medium">Outbound email</span><span class="mt-1 block text-[9px] text-muted-foreground">Allow users to send email through Resend.</span></span><input bind:checked={config.sendingEnabled} type="checkbox" class="size-4 accent-primary" /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Inbox auto-refresh</span><select bind:value={config.autoRefresh} class="h-9 w-full rounded-lg border bg-background px-3 text-xs"><option>Off</option><option>5 minutes</option><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option></select></label>
					<div class="mt-3"><Button type="button" variant="outline" size="sm" class="rounded-full" onclick={() => (showPrefixes = true)}>Configure email prefixes</Button></div>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Workspace appearance</h2><p class="mt-1 text-[10px] text-muted-foreground">Customize the name and sign-in screen.</p><Separator class="my-4" />
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="space-y-1.5 text-[10px] font-medium"><span>Workspace title</span><Input bind:value={config.title} class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium"><span>Sign-in panel opacity</span><Input bind:value={config.loginOpacity} type="number" min="0" max="1" step="0.01" class="h-9 text-xs" /></label>
						<label class="space-y-1.5 text-[10px] font-medium sm:col-span-2"><span>Sign-in background image URL</span><span class="flex gap-2"><Input bind:value={config.loginBackground} placeholder="https://…" class="h-9 text-xs" /><Button type="button" variant="outline" size="icon-sm" aria-label="Preview sign-in background"><Image data-icon="inline-start" /></Button></span></label>
					</div>
					<label class="mt-4 flex items-center justify-between gap-4 border-t pt-3"><span><span class="block text-[11px] font-medium">Show project link</span><span class="mt-1 block text-[9px] text-muted-foreground">Display a link to the project repository on sign-in.</span></span><input bind:checked={config.projectLink} type="checkbox" class="size-4 accent-primary" /></label>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5">
					<h2 class="text-xs font-semibold">Sign-in providers and verification</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose available OAuth providers and bot verification.</p><Separator class="my-4" />
					<div class="divide-y">
						<label class="flex items-center justify-between py-3 text-[11px]">Google OAuth<input bind:checked={config.googleOAuth} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">GitHub OAuth<input bind:checked={config.githubOAuth} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">Linux DO OAuth<input bind:checked={config.linuxDoOAuth} type="checkbox" class="size-4 accent-primary" /></label>
						<label class="flex items-center justify-between py-3 text-[11px]">Cloudflare Turnstile<input bind:checked={config.turnstile} type="checkbox" class="size-4 accent-primary" /></label>
					</div>
					<label class="mt-3 block space-y-1.5 text-[10px] font-medium"><span>Turnstile site key</span><Input bind:value={config.siteKey} class="h-9 text-xs" placeholder="Site key" /></label>
					<p class="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground"><ExternalLink size={11} /> OAuth credentials are managed in environment configuration.</p>
				</section>

				<section class="rounded-xl border bg-card p-4 sm:p-5 xl:col-span-2">
					<h2 class="text-xs font-semibold">Domain and sender rules</h2><p class="mt-1 text-[10px] text-muted-foreground">Restrict registration and filter blocked senders.</p><Separator class="my-4" />
					<div class="grid gap-4 sm:grid-cols-2"><label class="space-y-1.5 text-[10px] font-medium"><span>Allowed domains</span><textarea bind:value={config.allowDomains} rows="5" class="w-full rounded-lg border bg-background p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea><span class="block text-[9px] font-normal text-muted-foreground">One domain per line.</span></label><label class="space-y-1.5 text-[10px] font-medium"><span>Blocked addresses and domains</span><textarea bind:value={config.blockedAddresses} rows="5" class="w-full rounded-lg border bg-background p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="spam@example.com"></textarea><span class="block text-[9px] font-normal text-muted-foreground">Use an email address, domain, or * to block all.</span></label></div>
				</section>
			</div>
			<div class="mt-4 flex items-center justify-end gap-3"><span role="status" class="text-[10px] text-muted-foreground">{#if saved}<Check size={12} class="mr-1 inline" />Saved in this preview{/if}</span><Button type="submit" size="sm" class="rounded-full"><Save data-icon="inline-start" />Save settings</Button></div>
		</form>
	</div>
</section>

{#if showPrefixes}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close email prefix settings" onclick={() => (showPrefixes = false)}></button>
		<section role="dialog" aria-modal="true" aria-labelledby="prefix-title" class="relative z-10 w-full max-w-[420px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="prefix-title" class="text-sm font-semibold">Email prefixes</h2><p class="mt-1 text-[10px] text-muted-foreground">Allowed local parts for generated email addresses.</p>
			<div class="mt-4 flex gap-2"><Input bind:value={prefixInput} placeholder="Add a prefix" class="h-9 text-xs" /><Button size="sm" class="rounded-full" onclick={addPrefix}>Add</Button></div>
			<div class="mt-3 flex flex-wrap gap-2">{#each emailPrefixes as prefix (prefix)}<Badge variant="secondary" class="gap-2 rounded-full px-2.5 py-1 text-[10px]">{prefix}<button type="button" aria-label={`Remove ${prefix}`} onclick={() => (emailPrefixes = emailPrefixes.filter((item) => item !== prefix))}>×</button></Badge>{/each}</div>
			<div class="mt-5 flex justify-end"><Button size="sm" class="rounded-full" onclick={() => (showPrefixes = false)}>Done</Button></div>
		</section>
	</div>
{/if}
