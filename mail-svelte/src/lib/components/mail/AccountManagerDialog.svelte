<script lang="ts">
	import { Copy, LoaderCircle, Pin, Plus, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { onMount } from 'svelte';
	import { mailUi } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { websiteConfig } from '$lib/api/config.js';
	import TurnstileWidget from '$lib/components/TurnstileWidget.svelte';
	import { addApiAccount, deleteApiAccount, fetchApiAccounts, pinApiAccount, renameApiAccount, setApiAccountAllMail } from '$lib/api/mail.js';
	import { toast } from 'svelte-sonner';

	let addOpen = $state(false);
	let newEmail = $state('');
	let notice = $state('');
	let renameId = $state<number | null>(null);
	let renameValue = $state('');
	let siteKey = $state('');
	let verificationRequired = $state(false);
	let verificationToken = $state('');
	let accountAddingEnabled = $state(false);
	let adding = $state(false);
	let renaming = $state(false);
	let removingId = $state<number | null>(null);
	let updatingFilterId = $state<number | null>(null);
	let pinningId = $state<number | null>(null);
	let loadingSettings = $state(true);
	const canAddAccount = $derived(accountAddingEnabled && hasPermission('Add mailbox'));
	const ownAccounts = $derived(mailAccounts);

	onMount(() => {
		void websiteConfig().then((config) => {
			siteKey = config.siteKey ?? '';
			verificationRequired = config.addEmailVerify === 0 || (config.addEmailVerify === 2 && config.addVerifyOpen === true);
			accountAddingEnabled = config.addEmail === 0 && config.manyEmail === 0;
		}).catch((error) => { notice = error instanceof Error ? error.message : 'Account settings could not be loaded.'; }).finally(() => { loadingSettings = false; });
	});

	function close() {
		mailUi.accountsOpen = false;
	}

	async function copyAddress(email: string) {
		try {
			await navigator.clipboard.writeText(email);
			toast.success('Address copied.');
		} catch {
			toast.info(email, { description: 'Clipboard access is unavailable. Copy this address manually.' });
		}
	}

	async function refreshAccounts() {
		const accounts = await fetchApiAccounts();
		mailAccounts.splice(0, mailAccounts.length, ...accounts);
	}

	async function addAccount(event: SubmitEvent) {
		event.preventDefault();
		if (!hasPermission('Add mailbox')) { toast.error('Your role cannot add mailboxes.'); return; }
		const email = newEmail.trim().toLowerCase();
		if (!email) { toast.warning('Enter a mailbox address.'); return; }
		if (verificationRequired && !verificationToken) { toast.warning('Complete the human verification first.'); return; }
		if (adding) return;
		adding = true;
		try {
			await addApiAccount(email, verificationToken);
			await refreshAccounts();
			const added = mailAccounts.find((account) => account.email.toLowerCase() === email);
			if (added) mailUi.currentAccountId = added.id;
			newEmail = '';
			verificationToken = '';
			addOpen = false;
			toast.success('Mailbox added.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Mailbox could not be added.');
		}
		finally { adding = false; }
	}

	async function saveName() {
		const account = mailAccounts.find((item) => item.id === renameId);
		if (account && renameValue.trim() && !renaming) {
			renaming = true;
			try {
				await renameApiAccount(account.id, renameValue.trim());
				await refreshAccounts();
				toast.success('Mailbox name updated.');
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Mailbox name could not be updated.');
				renaming = false;
				return;
			}
			renaming = false;
		} else if (account && !renameValue.trim()) {
			toast.warning('Enter a mailbox display name.');
			return;
		}
		renameId = null;
	}

	async function removeAccount(id: number) {
		if (removingId !== null) return;
		removingId = id;
		try {
			await deleteApiAccount(id);
			await refreshAccounts();
			if (mailUi.currentAccountId === id) mailUi.currentAccountId = mailAccounts.find((account) => account.primary)?.id ?? mailAccounts[0]?.id ?? 0;
			toast.success('Mailbox removed.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Mailbox could not be removed.');
		}
		finally { removingId = null; }
	}

	async function toggleAllMail(accountId: number, checked: boolean) {
		const account = mailAccounts.find((item) => item.id === accountId);
		if (!account) return;
		if (account.allMail === checked) return;
		if (updatingFilterId !== null) return;
		updatingFilterId = accountId;
		try {
			await setApiAccountAllMail(accountId);
			await refreshAccounts();
			toast.success('Mailbox receive filter updated.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Mailbox filter could not be updated.');
		}
		finally { updatingFilterId = null; }
	}

	async function togglePinned(accountId: number) {
		const account = mailAccounts.find((item) => item.id === accountId);
		if (!account) return;
		if (pinningId !== null) return;
		pinningId = accountId;
		try {
			await pinApiAccount(accountId);
			await refreshAccounts();
			toast.success('Mailbox moved to the top.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Mailbox could not be reordered.');
		}
		finally { pinningId = null; }
	}
</script>

	<Dialog.Root open={mailUi.accountsOpen} onOpenChange={(open) => { if (!open) close(); }}>
	<Dialog.Content showCloseButton={false} class="flex max-h-[min(680px,100svh)] max-w-[580px] flex-col gap-0 overflow-hidden rounded-t-2xl border p-0 shadow-2xl sm:rounded-2xl">
		<Dialog.Header class="flex-row items-center justify-between border-b px-5 py-4">
			<div>
				<Dialog.Title id="mailbox-title" class="text-sm font-semibold">Mailboxes</Dialog.Title>
				<Dialog.Description class="mt-1 text-[10px] text-muted-foreground">Switch accounts and choose which mail to include.</Dialog.Description>
			</div>
			<Button variant="ghost" size="icon-sm" aria-label="Close mailbox manager" onclick={close}><X data-icon="inline-start" /></Button>
		</Dialog.Header>
		<div class="min-h-0 flex-1 space-y-2 overflow-auto p-4 sm:p-5">
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
						<Button variant="ghost" size="icon-xs" aria-label="Move mailbox to top" aria-pressed={account.pinned} disabled={pinningId !== null} onclick={() => { void togglePinned(account.id); }}>{#if pinningId === account.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Pin data-icon="inline-start" />{/if}</Button>
						<Button variant="ghost" size="xs" onclick={() => { renameId = account.id; renameValue = account.name || ''; }}>Rename</Button>
						{#if !account.primary && hasPermission('Remove mailbox')}<Button variant="ghost" size="icon-xs" aria-label="Remove mailbox" disabled={removingId !== null} onclick={() => removeAccount(account.id)}>{#if removingId === account.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Trash2 data-icon="inline-start" />{/if}</Button>{/if}
					</div>
					{#if renameId === account.id}<form class="mt-3 flex gap-2" onsubmit={(event) => { event.preventDefault(); void saveName(); }}><Input bind:value={renameValue} placeholder="Mailbox display name" class="h-8 min-w-0 text-xs" disabled={renaming} /><Button type="submit" size="xs" disabled={renaming}>{#if renaming}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{renaming ? 'Saving…' : 'Save'}</Button></form>{/if}
					<label class="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
						<Switch checked={account.allMail} onCheckedChange={(checked) => { void toggleAllMail(account.id, checked); }} aria-label={`Include all mail for ${account.email}`} disabled={updatingFilterId !== null} size="sm" />
						Include all received mail from this mailbox
					</label>
				</div>
			{/each}

			{#if addOpen}
				<form class="flex gap-2 rounded-xl border border-dashed p-3" onsubmit={addAccount}>
					<Input bind:value={newEmail} type="email" required placeholder="mailbox@example.com" class="h-9 text-xs" disabled={adding} />
					<Button type="submit" size="sm" class="shrink-0 rounded-full" disabled={adding}>{#if adding}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{adding ? 'Adding…' : 'Add'}</Button>
				</form>
				{#if verificationRequired && siteKey}<TurnstileWidget {siteKey} onToken={(token) => (verificationToken = token)} />{/if}
			{/if}
		</div>
		<footer class="flex items-center justify-between border-t px-5 py-3">
			<div class="text-[10px] text-muted-foreground" role="status">{#if notice}<span class="text-destructive">{notice}</span>{:else if loadingSettings}<LoadingState label="Loading mailbox settings…" />{:else}{ownAccounts.length} mailboxes{/if}</div>
		{#if canAddAccount}<Button variant="outline" size="sm" class="rounded-full" onclick={() => (addOpen = !addOpen)}><Plus data-icon="inline-start" />Add mailbox</Button>{/if}
		</footer>
	</Dialog.Content>
</Dialog.Root>
