<script lang="ts">
	import { Copy, Pin, Plus, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { onMount } from 'svelte';
	import { mailUi } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { websiteConfig } from '$lib/api/config.js';
	import TurnstileWidget from '$lib/components/TurnstileWidget.svelte';
	import { addApiAccount, deleteApiAccount, fetchApiAccounts, pinApiAccount, renameApiAccount, setApiAccountAllMail } from '$lib/api/mail.js';

	let addOpen = $state(false);
	let newEmail = $state('');
	let notice = $state('');
	let renameId = $state<number | null>(null);
	let renameValue = $state('');
	let siteKey = $state('');
	let verificationRequired = $state(false);
	let verificationToken = $state('');
	let accountAddingEnabled = $state(false);
	const canAddAccount = $derived(accountAddingEnabled && hasPermission('Add mailbox'));
	const ownAccounts = $derived(mailAccounts);

	onMount(() => {
		void websiteConfig().then((config) => {
			siteKey = config.siteKey ?? '';
			verificationRequired = config.addEmailVerify === 0 || (config.addEmailVerify === 2 && config.addVerifyOpen === true);
			accountAddingEnabled = config.addEmail === 0 && config.manyEmail === 0;
		}).catch((error) => { notice = error instanceof Error ? error.message : 'Account settings could not be loaded.'; });
	});

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

	async function refreshAccounts() {
		const accounts = await fetchApiAccounts();
		mailAccounts.splice(0, mailAccounts.length, ...accounts);
	}

	async function addAccount(event: SubmitEvent) {
		event.preventDefault();
		if (!hasPermission('Add mailbox')) { notice = 'Your role cannot add mailboxes.'; return; }
		const email = newEmail.trim().toLowerCase();
		if (verificationRequired && !verificationToken) { notice = 'Complete the human verification first.'; return; }
		try {
			await addApiAccount(email, verificationToken);
			await refreshAccounts();
			const added = mailAccounts.find((account) => account.email.toLowerCase() === email);
			if (added) mailUi.currentAccountId = added.id;
			newEmail = '';
			verificationToken = '';
			addOpen = false;
			notice = 'Mailbox added.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Mailbox could not be added.';
		}
	}

	async function saveName() {
		const account = mailAccounts.find((item) => item.id === renameId);
		if (account && renameValue.trim()) {
			try {
				await renameApiAccount(account.id, renameValue.trim());
				await refreshAccounts();
				notice = 'Mailbox name updated.';
			} catch (error) {
				notice = error instanceof Error ? error.message : 'Mailbox name could not be updated.';
				return;
			}
		}
		renameId = null;
	}

	async function removeAccount(id: number) {
		try {
			await deleteApiAccount(id);
			await refreshAccounts();
			if (mailUi.currentAccountId === id) mailUi.currentAccountId = mailAccounts.find((account) => account.primary)?.id ?? mailAccounts[0]?.id ?? 0;
			notice = 'Mailbox removed.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Mailbox could not be removed.';
		}
	}

	async function toggleAllMail(accountId: number, checked: boolean) {
		const account = mailAccounts.find((item) => item.id === accountId);
		if (!account) return;
		if (account.allMail === checked) return;
		try {
			await setApiAccountAllMail(accountId);
			await refreshAccounts();
			notice = 'Mailbox receive filter updated.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Mailbox filter could not be updated.';
		}
	}

	async function togglePinned(accountId: number) {
		const account = mailAccounts.find((item) => item.id === accountId);
		if (!account) return;
		try {
			await pinApiAccount(accountId);
			await refreshAccounts();
			notice = 'Mailbox moved to the top.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Mailbox could not be reordered.';
		}
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
						<Button variant="ghost" size="icon-xs" aria-label="Move mailbox to top" aria-pressed={account.pinned} onclick={() => { void togglePinned(account.id); }}><Pin data-icon="inline-start" /></Button>
						<Button variant="ghost" size="xs" onclick={() => { renameId = account.id; renameValue = account.name || ''; }}>Rename</Button>
						{#if !account.primary && hasPermission('Remove mailbox')}<Button variant="ghost" size="icon-xs" aria-label="Remove mailbox" onclick={() => removeAccount(account.id)}><Trash2 data-icon="inline-start" /></Button>{/if}
					</div>
					{#if renameId === account.id}<form class="mt-3 flex gap-2" onsubmit={(event) => { event.preventDefault(); void saveName(); }}><Input bind:value={renameValue} placeholder="Mailbox display name" class="h-8 min-w-0 text-xs" /><Button type="submit" size="xs">Save</Button></form>{/if}
					<label class="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
						<Switch checked={account.allMail} onCheckedChange={(checked) => { void toggleAllMail(account.id, checked); }} aria-label={`Include all mail for ${account.email}`} size="sm" />
						Include all received mail from this mailbox
					</label>
				</div>
			{/each}

			{#if addOpen}
				<form class="flex gap-2 rounded-xl border border-dashed p-3" onsubmit={addAccount}>
					<Input bind:value={newEmail} type="email" required placeholder="mailbox@example.com" class="h-9 text-xs" />
					<Button type="submit" size="sm" class="shrink-0 rounded-full">Add</Button>
				</form>
				{#if verificationRequired && siteKey}<TurnstileWidget {siteKey} onToken={(token) => (verificationToken = token)} />{/if}
			{/if}
		</div>
		<footer class="flex items-center justify-between border-t px-5 py-3">
			<p class="text-[10px] text-muted-foreground" role="status">{notice || `${ownAccounts.length} mailboxes`}</p>
		{#if canAddAccount}<Button variant="outline" size="sm" class="rounded-full" onclick={() => (addOpen = !addOpen)}><Plus data-icon="inline-start" />Add mailbox</Button>{/if}
		</footer>
	</div>
</div>
