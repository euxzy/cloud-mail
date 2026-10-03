<script lang="ts">
	import { ArrowDown, ArrowUp, Filter, RefreshCw, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { mailMessages } from '$lib/mail-data.svelte.js';

	type MailScope = 'all' | 'received' | 'sent' | 'deleted' | 'no-recipient';
	let scope = $state<MailScope>('all');
	let searchBy = $state('subject');
	let query = $state('');
	let newestFirst = $state(true);
	let selectedIds = $state<string[]>([]);
	let showCleanup = $state(false);
	let cleanupSender = $state('');
	let cleanupSubject = $state('');
	let cleanupMailbox = $state('');
	let cleanupRecipient = $state('');
	let cleanupStart = $state('');
	let cleanupEnd = $state('');
	let cleanupMatch = $state('contains');
	let cleanupNotice = $state('');

	const scopedMessages = $derived.by(() => {
		const items = mailMessages.filter((message) => {
			const isDeleted = !!message.deleted;
			if (scope === 'deleted') return isDeleted;
			if (isDeleted) return false;
			if (scope === 'received') return message.folder === 'inbox';
			if (scope === 'sent') return message.folder === 'sent';
			if (scope === 'no-recipient') return message.folder === 'sent' && !message.recipients?.length;
			return true;
		});
		const q = query.trim().toLowerCase();
		const filtered = items.filter((message) => {
			const values: Record<string, string> = {
				from: message.from,
				subject: message.subject,
				user: message.ownerEmail ?? 'sarah@cloudmail.id',
				mailbox: message.folder === 'sent' ? message.address : (message.recipients?.[0] ?? '')
			};
			return !q || (values[searchBy] ?? `${message.from} ${message.subject}`).toLowerCase().includes(q);
		});
		return newestFirst ? filtered : [...filtered].reverse();
	});

	function toggleSelected(id: string) {
		selectedIds = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
	}

	function selectAll() {
		selectedIds = selectedIds.length === scopedMessages.length ? [] : scopedMessages.map((message) => message.id);
	}

	function deleteSelected() {
		for (const message of mailMessages) if (selectedIds.includes(message.id)) message.deleted = true;
		selectedIds = [];
	}

	function statusLabel(message: (typeof mailMessages)[number], deleted: boolean) {
		if (deleted) return 'Deleted';
		if (message.folder === 'drafts') return 'Draft';
		return ({ queued: 'Queued', delivered: 'Delivered', bounced: 'Bounced', complained: 'Complaint', delayed: 'Delayed' } as const)[message.status ?? 'delivered'];
	}

	function applyCleanup(event: SubmitEvent) {
		event.preventDefault();
		const hasCriteria = [cleanupSender, cleanupSubject, cleanupMailbox, cleanupRecipient, cleanupStart, cleanupEnd].some((value) => value.trim());
		if (!hasCriteria) {
			cleanupNotice = 'Add at least one filter before bulk cleanup.';
			showCleanup = false;
			return;
		}
		const matchesField = (actual: string, expected: string) => {
			if (!expected) return true;
			const value = actual.toLowerCase();
			const filter = expected.toLowerCase();
			if (cleanupMatch === 'equals') return value === filter;
			if (cleanupMatch === 'starts-with') return value.startsWith(filter);
			return value.includes(filter);
		};
		const matches = mailMessages.filter((message) => {
			const date = message.timestamp?.slice(0, 10) ?? '';
			return matchesField(message.from, cleanupSender)
				&& matchesField(message.subject, cleanupSubject)
				&& matchesField(message.folder === 'sent' ? message.address : (message.recipients?.[0] ?? ''), cleanupMailbox)
				&& matchesField((message.recipients ?? []).join(', '), cleanupRecipient)
				&& (!cleanupStart || date >= cleanupStart)
				&& (!cleanupEnd || date <= cleanupEnd);
		});
		for (const message of matches) message.deleted = true;
		cleanupNotice = `${matches.length} matching messages moved to deleted in this preview.`;
		showCleanup = false;
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1360px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">All mail</h1><p class="mt-1 text-[13px] text-muted-foreground">Search and manage messages across every mailbox.</p></div>
			<div class="flex items-center gap-2"><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">Admin view</Badge><Button variant="outline" size="sm" class="rounded-full" onclick={() => (showCleanup = true)}><Filter data-icon="inline-start" />Bulk cleanup</Button></div>
		</div>

		<div class="mt-5 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<SelectControl bind:value={searchBy} items={[{ value: 'subject', label: 'Subject' }, { value: 'from', label: 'Sender' }, { value: 'user', label: 'User' }, { value: 'mailbox', label: 'Mailbox' }]} aria-label="Search field" class="h-9 text-[10px]" />
				<div class="relative min-w-0 flex-1"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={query} placeholder="Search all messages" class="h-9 pl-8 text-xs" /></div>
			</div>
			<div class="flex items-center gap-2">
				<SelectControl bind:value={scope} items={[{ value: 'all', label: 'All messages' }, { value: 'received', label: 'Received' }, { value: 'sent', label: 'Sent' }, { value: 'deleted', label: 'Deleted' }, { value: 'no-recipient', label: 'No recipient' }]} aria-label="Message scope" class="h-9 min-w-0 flex-1 text-[10px] sm:flex-none" />
				<Button variant="ghost" size="icon-sm" aria-label="Reverse sort order" onclick={() => (newestFirst = !newestFirst)}>{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}</Button>
				<Button variant="ghost" size="icon-sm" aria-label="Refresh list" onclick={() => { query = ''; selectedIds = []; }}><RefreshCw data-icon="inline-start" /></Button>
			</div>
		</div>

		<div class="mt-3 flex items-center justify-between gap-3 px-1 text-[10px] text-muted-foreground">
			<label class="flex items-center gap-2"><Switch checked={scopedMessages.length > 0 && selectedIds.length === scopedMessages.length} onCheckedChange={selectAll} size="sm" />Select all</label>
			<div class="flex items-center gap-3"><span>{scopedMessages.length} messages</span>{#if selectedIds.length}<Button variant="ghost" size="xs" class="text-destructive" onclick={deleteSelected}><Trash2 data-icon="inline-start" />Delete {selectedIds.length}</Button>{/if}</div>
		</div>

		<div class="mt-2 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[760px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="w-9 px-3 py-2"></th><th class="px-3 py-2">Sender / mailbox</th><th class="px-3 py-2">Subject</th><th class="px-3 py-2">User</th><th class="px-3 py-2">Status</th><th class="px-3 py-2 text-right">Date</th></tr></thead>
				<tbody class="divide-y">
					{#each scopedMessages as message (message.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-3 py-3"><Switch checked={selectedIds.includes(message.id)} onCheckedChange={() => toggleSelected(message.id)} aria-label="Select message" size="sm" /></td>
							<td class="max-w-[210px] px-3 py-3"><span class="block truncate font-medium">{message.from}</span><span class="mt-1 block truncate text-[9px] text-muted-foreground">{message.folder === 'sent' ? message.address : (message.recipients?.[0] ?? '')}</span></td>
							<td class="max-w-[420px] px-3 py-3"><a href="/mail/{message.id}?from=all-mail" class="block truncate font-medium hover:underline">{message.subject}</a><span class="mt-1 block truncate text-[9px] text-muted-foreground">{message.preview}</span></td>
							<td class="px-3 py-3 text-muted-foreground">{message.ownerEmail ?? 'sarah@cloudmail.id'}</td>
							<td class="px-3 py-3"><Badge variant={statusLabel(message, !!message.deleted) === 'Bounced' ? 'destructive' : statusLabel(message, !!message.deleted) === 'Delayed' ? 'outline' : 'secondary'} class="h-5 rounded-full px-2 text-[9px]">{statusLabel(message, !!message.deleted)}</Badge></td>
							<td class="px-3 py-3 text-right text-[9px] tabular-nums text-muted-foreground">{message.date}</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="px-4 py-14 text-center text-xs text-muted-foreground">No messages match these filters.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if cleanupNotice}<p class="mt-3 text-[10px] text-muted-foreground" role="status">{cleanupNotice}</p>{/if}
	</div>
</section>

{#if showCleanup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close bulk cleanup" onclick={() => (showCleanup = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="cleanup-title" class="relative z-10 w-full max-w-[440px] rounded-2xl border bg-background p-5 shadow-xl">
			<div class="flex items-start justify-between"><div><h2 id="cleanup-title" class="text-sm font-semibold">Bulk cleanup</h2><p class="mt-1 text-[10px] text-muted-foreground">Delete messages matching all entered filters.</p></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (showCleanup = false)}><X data-icon="inline-start" /></Button></div>
			<form class="mt-4 space-y-2.5" onsubmit={applyCleanup}>
				<Input bind:value={cleanupSender} placeholder="Sender name" class="h-9 text-xs" />
				<Input bind:value={cleanupSubject} placeholder="Subject contains" class="h-9 text-xs" />
				<Input bind:value={cleanupMailbox} placeholder="Mailbox address" class="h-9 text-xs" />
				<Input bind:value={cleanupRecipient} placeholder="Recipient address" class="h-9 text-xs" />
				<div class="grid grid-cols-2 gap-2"><label class="space-y-1 text-[10px]">From date<Input bind:value={cleanupStart} type="date" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">To date<Input bind:value={cleanupEnd} type="date" class="h-9 text-xs" /></label></div>
				<div class="flex items-center justify-between gap-3 pt-2"><SelectControl bind:value={cleanupMatch} items={[{ value: 'equals', label: 'Exact match' }, { value: 'starts-with', label: 'Starts with' }, { value: 'contains', label: 'Contains' }]} aria-label="Text matching rule" class="h-9 text-[10px]" /><div class="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showCleanup = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Delete matches</Button></div></div>
			</form>
		</div>
	</div>
{/if}
