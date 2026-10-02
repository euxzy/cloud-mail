<script lang="ts">
	import { Copy, Pin, Plus, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { mailUi } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';

	let addOpen = $state(false);
	let newEmail = $state('');
	let notice = $state('');

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
		const email = newEmail.trim().toLowerCase();
		if (!email || mailAccounts.some((account) => account.email === email)) return;
		const id = Math.max(0, ...mailAccounts.map((account) => account.id)) + 1;
		mailAccounts.push({ id, email, primary: false, pinned: false, allMail: true });
		mailUi.currentAccountId = id;
		newEmail = '';
		addOpen = false;
		notice = 'Mailbox added to this preview.';
	}
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-0 backdrop-blur-[1px] sm:items-center sm:p-5" role="presentation">
	<button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close mailbox manager" onclick={close}></button>
	<section role="dialog" aria-modal="true" aria-labelledby="mailbox-title" tabindex="-1" class="relative z-10 max-h-[min(680px,100svh)] w-full max-w-[580px] overflow-auto rounded-t-2xl border bg-background shadow-2xl sm:rounded-2xl">
		<header class="flex items-center justify-between border-b px-5 py-4">
			<div>
				<h2 id="mailbox-title" class="text-sm font-semibold">Mailboxes</h2>
				<p class="mt-1 text-[10px] text-muted-foreground">Switch accounts and choose which mail to include.</p>
			</div>
			<Button variant="ghost" size="icon-sm" aria-label="Close mailbox manager" onclick={close}><X data-icon="inline-start" /></Button>
		</header>
		<div class="space-y-2 p-4 sm:p-5">
			{#each mailAccounts as account (account.id)}
				<div class="rounded-xl border px-3 py-3 {mailUi.currentAccountId === account.id ? 'border-foreground/30 bg-muted/30' : ''}">
					<div class="flex items-center gap-3">
						<button class="min-w-0 flex-1 text-left" onclick={() => (mailUi.currentAccountId = account.id)}>
							<span class="flex flex-wrap items-center gap-2 text-xs font-medium">
								<span class="truncate">{account.email}</span>
								{#if account.primary}<Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[9px]">Primary</Badge>{/if}
								{#if mailUi.currentAccountId === account.id}<Badge variant="outline" class="h-4 rounded-full px-1.5 text-[9px]">Current</Badge>{/if}
							</span>
						</button>
						<Button variant="ghost" size="icon-xs" aria-label="Copy mailbox address" onclick={() => copyAddress(account.email)}><Copy data-icon="inline-start" /></Button>
						<Button variant="ghost" size="icon-xs" aria-label={account.pinned ? 'Unpin mailbox' : 'Pin mailbox'} aria-pressed={account.pinned} onclick={() => (account.pinned = !account.pinned)}><Pin data-icon="inline-start" /></Button>
						{#if !account.primary}<Button variant="ghost" size="icon-xs" aria-label="Remove mailbox" onclick={() => { mailAccounts.splice(mailAccounts.findIndex((item) => item.id === account.id), 1); if (mailUi.currentAccountId === account.id) mailUi.currentAccountId = mailAccounts[0]?.id ?? 0; }}><Trash2 data-icon="inline-start" /></Button>{/if}
					</div>
					<label class="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
						<input bind:checked={account.allMail} type="checkbox" class="size-3.5 accent-primary" />
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
			<p class="text-[10px] text-muted-foreground" role="status">{notice || `${mailAccounts.length} mailboxes in preview`}</p>
			<Button variant="outline" size="sm" class="rounded-full" onclick={() => (addOpen = !addOpen)}><Plus data-icon="inline-start" />Add mailbox</Button>
		</footer>
	</section>
</div>
