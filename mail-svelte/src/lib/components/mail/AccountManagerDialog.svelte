<script lang="ts">
	import { Copy, Pin, Plus, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { mailUi } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { adminRoles, adminUsers } from '$lib/admin-data.svelte.js';
	import { hasPreviewPermission, previewSession } from '$lib/preview-state.svelte.js';

	let addOpen = $state(false);
	let newEmail = $state('');
	let notice = $state('');
	let renameId = $state<number | null>(null);
	let renameValue = $state('');
	const ownAccounts = $derived(mailAccounts.filter((account) => (account.ownerEmail ?? 'sarah@cloudmail.id') === previewSession.email));

	function close() {
		mailUi.accountsOpen = false;
	}

	async function copyAddress(email: string) {
		try {
			await navigator.clipboard.writeText(email);
			notice = 'Address copied.';
		} catch {
			notice = email;
		}
	}

	function addAccount(event: SubmitEvent) {
		event.preventDefault();
		const settings = JSON.parse(localStorage.getItem('cloud-mail-system-settings-preview') || '{}') as { allowMailboxAdd?: boolean; multiMailbox?: boolean; minEmailPrefix?: number; emailPrefixFilter?: string; allowDomains?: string };
		if (!hasPreviewPermission('Add mailbox')) { notice = 'Your role cannot add mailboxes.'; return; }
		if (settings.allowMailboxAdd === false || (settings.multiMailbox === false && ownAccounts.length > 0)) { notice = 'Mailbox creation is disabled in system settings.'; return; }
		const user = adminUsers.find((item) => item.email === previewSession.email);
		const role = adminRoles.find((item) => item.name === user?.role);
		if (role?.mailboxLimit && ownAccounts.length >= role.mailboxLimit) { notice = 'Your mailbox limit has been reached.'; return; }
		const email = newEmail.trim().toLowerCase();
		const [prefix, domain] = email.split('@');
		if (prefix.length < Number(settings.minEmailPrefix ?? 1)) { notice = 'The mailbox prefix is too short.'; return; }
		if (settings.emailPrefixFilter?.split(/[\n,]/).some((item) => item.trim() && prefix.includes(item.trim().toLowerCase()))) { notice = 'This mailbox prefix is not allowed.'; return; }
		const allowed = settings.allowDomains?.split(/[\n,]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
		if (allowed?.length && !allowed.includes(domain)) { notice = 'This domain is not allowed.'; return; }
		if (role?.allowedDomains?.length && !role.allowedDomains.includes(email.split('@')[1])) { notice = 'This domain is not allowed for your role.'; return; }
		if (!email || mailAccounts.some((account) => account.email === email)) { notice = 'This mailbox already exists.'; return; }
		const id = Math.max(0, ...mailAccounts.map((account) => account.id)) + 1;
		mailAccounts.push({ id, email, ownerEmail: previewSession.email, primary: false, pinned: false, allMail: true });
		mailUi.currentAccountId = id;
		if (user) user.mailboxes = ownAccounts.length;
		newEmail = '';
		addOpen = false;
		notice = 'Mailbox added to this preview.';
	}

	function saveName() {
		const account = mailAccounts.find((item) => item.id === renameId);
		if (account && renameValue.trim()) account.name = renameValue.trim();
		renameId = null;
		notice = 'Mailbox name updated.';
	}

	function removeAccount(id: number) {
		const index = mailAccounts.findIndex((item) => item.id === id && !item.primary);
		if (index < 0) return;
		mailAccounts.splice(index, 1);
		if (mailUi.currentAccountId === id) mailUi.currentAccountId = ownAccounts[0]?.id ?? 0;
		const user = adminUsers.find((item) => item.email === previewSession.email);
		if (user) user.mailboxes = ownAccounts.length;
		notice = 'Mailbox removed.';
	}
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-0 backdrop-blur-[1px] sm:items-center sm:p-5" role="presentation">
	<button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close mailbox manager" onclick={close}></button>
	<div role="dialog" aria-modal="true" aria-labelledby="mailbox-title" tabindex="-1" class="relative z-10 max-h-[min(680px,100svh)] w-full max-w-[580px] overflow-auto rounded-t-2xl border bg-background shadow-2xl sm:rounded-2xl">
		<header class="flex items-center justify-between border-b px-5 py-4">
			<div>
				<h2 id="mailbox-title" class="text-sm font-semibold">Mailboxes</h2>
				<p class="mt-1 text-[10px] text-muted-foreground">Switch accounts and choose which mail to include.</p>
			</div>
			<Button variant="ghost" size="icon-sm" aria-label="Close mailbox manager" onclick={close}><X data-icon="inline-start" /></Button>
		</header>
		<div class="space-y-2 p-4 sm:p-5">
		{#each [...ownAccounts].sort((a, b) => Number(b.pinned) - Number(a.pinned)) as account (account.id)}
				<div class="rounded-xl border px-3 py-3 {mailUi.currentAccountId === account.id ? 'border-foreground/30 bg-muted/30' : ''}">
					<div class="flex items-center gap-3">
						<button class="min-w-0 flex-1 text-left" onclick={() => (mailUi.currentAccountId = account.id)}>
							<span class="flex flex-wrap items-center gap-2 text-xs font-medium">
									<span class="truncate">{account.name || account.email}</span>
								{#if account.primary}<Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[9px]">Primary</Badge>{/if}
								{#if mailUi.currentAccountId === account.id}<Badge variant="outline" class="h-4 rounded-full px-1.5 text-[9px]">Current</Badge>{/if}
								</span>
								{#if account.name}<span class="mt-1 block truncate text-[9px] text-muted-foreground">{account.email}</span>{/if}
							</button>
						<Button variant="ghost" size="icon-xs" aria-label="Copy mailbox address" onclick={() => copyAddress(account.email)}><Copy data-icon="inline-start" /></Button>
						<Button variant="ghost" size="icon-xs" aria-label={account.pinned ? 'Unpin mailbox' : 'Pin mailbox'} aria-pressed={account.pinned} onclick={() => (account.pinned = !account.pinned)}><Pin data-icon="inline-start" /></Button>
						<Button variant="ghost" size="xs" onclick={() => { renameId = account.id; renameValue = account.name || ''; }}>Rename</Button>
						{#if !account.primary && hasPreviewPermission('Remove mailbox')}<Button variant="ghost" size="icon-xs" aria-label="Remove mailbox" onclick={() => removeAccount(account.id)}><Trash2 data-icon="inline-start" /></Button>{/if}
					</div>
					{#if renameId === account.id}<form class="mt-3 flex gap-2" onsubmit={(event) => { event.preventDefault(); saveName(); }}><Input bind:value={renameValue} placeholder="Mailbox display name" class="h-8 min-w-0 text-xs" /><Button type="submit" size="xs">Save</Button></form>{/if}
					<label class="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
						<Switch bind:checked={account.allMail} aria-label={`Include all mail for ${account.email}`} size="sm" />
						Include all received mail from this mailbox
					</label>
				</div>
			{/each}

			{#if addOpen}
				<form class="flex gap-2 rounded-xl border border-dashed p-3" onsubmit={addAccount}>
					<Input bind:value={newEmail} type="email" required placeholder="mailbox@example.com" class="h-9 text-xs" />
					<Button type="submit" size="sm" class="shrink-0 rounded-full">Add</Button>
				</form>
			{/if}
		</div>
		<footer class="flex items-center justify-between border-t px-5 py-3">
			<p class="text-[10px] text-muted-foreground" role="status">{notice || `${ownAccounts.length} mailboxes`}</p>
			{#if hasPreviewPermission('Add mailbox')}<Button variant="outline" size="sm" class="rounded-full" onclick={() => (addOpen = !addOpen)}><Plus data-icon="inline-start" />Add mailbox</Button>{/if}
		</footer>
	</div>
</div>
