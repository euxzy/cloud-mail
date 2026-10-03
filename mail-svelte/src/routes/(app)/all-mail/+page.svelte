<script lang="ts">
	import { ArrowDown, ArrowUp, Filter, LoaderCircle, RefreshCw, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { mailMessages } from '$lib/mail-data.svelte.js';
	import { fetchApiAllMessages } from '$lib/api/mail.js';
	import { batchDeleteAllEmail, deleteAllEmail } from '$lib/api/admin.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { toast } from 'svelte-sonner';

	type MailScope = 'all' | 'received' | 'sent' | 'deleted' | 'no-recipient';
	let scope = $state<MailScope>('all');
	let searchBy = $state('subject');
	let query = $state('');
	let newestFirst = $state(true);
	let selectedIds = $state<string[]>([]);
	let confirmSelectedDeleteOpen = $state(false);
	let showCleanup = $state(false);
	let cleanupReview = $state(false);
	let cleanupSender = $state('');
	let cleanupSubject = $state('');
	let cleanupMailbox = $state('');
	let cleanupRecipient = $state('');
	let cleanupStart = $state('');
	let cleanupEnd = $state('');
	let cleanupMatch = $state('contains');
	let loading = $state(true);
	let deletingSelected = $state(false);
	let cleaning = $state(false);
	let page = $state(1);
	let pageCursors = $state<number[]>([0]);
	let hasMore = $state(false);
	let total = $state(0);
	let refreshKey = $state(0);
	let requestId = 0;
	let lastFilterKey = '';
	const canDeleteAllEmail = $derived(hasPermission('all-email:delete'));

	const scopedMessages = $derived(mailMessages);
	const selectedVisibleCount = $derived(scopedMessages.filter((message) => selectedIds.includes(message.id)).length);
	const allSelected = $derived(scopedMessages.length > 0 && selectedVisibleCount === scopedMessages.length);
	const someSelected = $derived(selectedVisibleCount > 0 && !allSelected);
	const pageStart = $derived(total > 0 ? Math.min(total, (page - 1) * 50 + 1) : 0);
	const pageEnd = $derived(Math.min(total, (page - 1) * 50 + scopedMessages.length));
	let statusNotice = $state('');
	$effect(() => {
		const filters = { scope, searchBy, query, newestFirst };
		const filterKey = `${JSON.stringify(filters)}:${refreshKey}`;
		if (filterKey === lastFilterKey) return;
		lastFilterKey = filterKey;
		page = 1;
		pageCursors = [0];
		selectedIds = [];
		void loadMessages(1, 0, filters);
	});

	type ListFilters = { scope: MailScope; searchBy: string; query: string; newestFirst: boolean };
	function listParams(cursor: number, filters: ListFilters) {
		const fieldMap: Record<string, string> = { from: 'name', subject: 'subject', user: 'userEmail', mailbox: 'accountEmail' };
		const params: Record<string, string | number | undefined> = {
			type: ({ all: 'all', received: 'receive', sent: 'send', deleted: 'delete', 'no-recipient': 'noone' } as const)[filters.scope],
			size: 50, timeSort: filters.newestFirst ? 0 : 1, emailId: cursor || undefined
		};
		if (filters.query.trim()) params[fieldMap[filters.searchBy] ?? 'subject'] = filters.query.trim();
		return params;
	}
	function currentFilters(): ListFilters { return { scope, searchBy, query, newestFirst }; }
	async function loadMessages(pageNumber: number, cursor: number, filters: ListFilters) {
		const currentRequest = ++requestId;
		loading = true;
		hasMore = false;
		statusNotice = '';
		mailMessages.splice(0, mailMessages.length);
		if (pageNumber === 1) total = 0;
		try {
			const response = await fetchApiAllMessages(listParams(cursor, filters));
			if (currentRequest !== requestId) return;
			const rows = response.list ?? [];
			mailMessages.splice(0, mailMessages.length, ...rows);
			total = response.total ?? 0;
			const nextCursor = Number(rows.at(-1)?.id ?? cursor);
			const cursorAdvanced = !cursor || (filters.newestFirst ? nextCursor < cursor : nextCursor > cursor);
			const cursors = pageCursors.slice(0, pageNumber);
			cursors[pageNumber] = nextCursor;
			pageCursors = cursors;
			hasMore = rows.length === 50 && pageNumber * 50 < total && nextCursor > 0 && cursorAdvanced;
			statusNotice = '';
		} catch (error) { if (currentRequest === requestId) statusNotice = error instanceof Error ? error.message : 'All mail could not be loaded.'; }
		finally { if (currentRequest === requestId) loading = false; }
	}
	function toggleSelected(id: string) { selectedIds = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]; }
	function selectAll() {
		if (allSelected) {
			const visibleIds = new Set(scopedMessages.map((message) => message.id));
			selectedIds = selectedIds.filter((id) => !visibleIds.has(id));
		} else {
			selectedIds = [...new Set([...selectedIds, ...scopedMessages.map((message) => message.id)])];
		}
	}
	function previousPage() {
		if (page <= 1 || loading) return;
		const targetPage = page - 1;
		const cursor = pageCursors[targetPage - 1] ?? 0;
		page = targetPage;
		selectedIds = [];
		void loadMessages(targetPage, cursor, currentFilters());
	}
	function nextPage() {
		if (!hasMore || loading) return;
		const targetPage = page + 1;
		const cursor = pageCursors[targetPage - 1] ?? 0;
		if (!cursor) return;
		page = targetPage;
		selectedIds = [];
		void loadMessages(targetPage, cursor, currentFilters());
	}
	function requestDeleteSelected() {
		if (!canDeleteAllEmail || !selectedIds.length || deletingSelected) return;
		confirmSelectedDeleteOpen = true;
	}
	async function deleteSelected() {
		if (!canDeleteAllEmail || !selectedIds.length || deletingSelected) return;
		const idsToDelete = [...selectedIds];
		deletingSelected = true;
		try { await deleteAllEmail(idsToDelete); const ids = new Set(idsToDelete); mailMessages.splice(0, mailMessages.length, ...mailMessages.filter((message) => !ids.has(message.id))); total = Math.max(0, total - ids.size); selectedIds = []; confirmSelectedDeleteOpen = false; toast.success('Selected messages permanently deleted.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Messages could not be deleted.'); }
		finally { deletingSelected = false; }
	}
	function statusLabel(message: (typeof mailMessages)[number], deleted: boolean) {
		if (deleted) return 'Deleted';
		return ({ sent: 'Sent', delivered: 'Delivered', bounced: 'Bounced', complained: 'Complaint', delayed: 'Delayed', failed: 'Failed', 'no-recipient': 'No recipient' } as const)[message.status ?? 'delivered'];
	}
	function applyCleanup(event: SubmitEvent) {
		event.preventDefault();
		if (!canDeleteAllEmail) return;
		const hasCriteria = [cleanupSender, cleanupSubject, cleanupMailbox, cleanupRecipient, cleanupStart, cleanupEnd].some((value) => value.trim());
		if (!hasCriteria) { toast.warning('Add at least one filter before bulk cleanup.'); return; }
		cleanupReview = true;
	}
	async function confirmCleanup() {
		if (!canDeleteAllEmail || cleaning) return;
		const type = cleanupMatch === 'equals' ? 'eq' : cleanupMatch === 'starts-with' ? 'left' : 'include';
		cleaning = true;
		try {
			await batchDeleteAllEmail({
				sendName: cleanupSender.trim(), subject: cleanupSubject.trim(), sendEmail: cleanupMailbox.trim(), toEmail: cleanupRecipient.trim(),
				startTime: cleanupStart || cleanupEnd ? `${cleanupStart || cleanupEnd} 00:00:00` : undefined,
				endTime: cleanupEnd || cleanupStart ? `${cleanupEnd || cleanupStart} 23:59:59` : undefined, type
			});
			toast.success('Matching messages permanently deleted.'); showCleanup = false; cleanupReview = false; refreshKey += 1;
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Bulk cleanup failed.'); }
		finally { cleaning = false; }
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1360px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">All mail</h1><p class="mt-1 text-[13px] text-muted-foreground">Search and manage messages across every mailbox.</p></div>
			<div class="flex items-center gap-2"><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">Admin view</Badge>{#if canDeleteAllEmail}<Button variant="outline" size="sm" class="rounded-full" onclick={() => { cleanupReview = false; showCleanup = true; }}><Filter data-icon="inline-start" />Bulk cleanup</Button>{/if}</div>
		</div>

		<div class="mt-5 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<SelectControl bind:value={searchBy} items={[{ value: 'subject', label: 'Subject' }, { value: 'from', label: 'Sender' }, { value: 'user', label: 'User' }, { value: 'mailbox', label: 'Mailbox' }]} aria-label="Search field" class="h-9 text-[10px]" />
				<div class="relative min-w-0 flex-1"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={query} placeholder="Search all messages" class="h-9 pl-8 text-xs" /></div>
			</div>
			<div class="flex items-center gap-2">
				<SelectControl bind:value={scope} items={[{ value: 'all', label: 'All messages' }, { value: 'received', label: 'Received' }, { value: 'sent', label: 'Sent' }, { value: 'deleted', label: 'Deleted' }, { value: 'no-recipient', label: 'No recipient' }]} aria-label="Message scope" class="h-9 min-w-0 flex-1 text-[10px] sm:flex-none" />
				<Button variant="ghost" size="icon-sm" aria-label="Reverse sort order" onclick={() => (newestFirst = !newestFirst)}>{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}</Button>
				<Button variant="ghost" size="icon-sm" aria-label="Refresh list" disabled={loading} onclick={() => { query = ''; refreshKey += 1; }}>{#if loading}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<RefreshCw data-icon="inline-start" />{/if}</Button>
			</div>
		</div>

		<div class="mt-3 flex items-center justify-between gap-3 px-1 text-[10px] text-muted-foreground">
			<div class="flex items-center gap-2"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={selectAll} aria-label="Select all messages on this page" /><span>Select all on this page</span></div>
			<div class="flex items-center gap-3"><span>{scopedMessages.length} messages on this page</span>{#if selectedIds.length && canDeleteAllEmail}<Button variant="ghost" size="xs" class="text-destructive" disabled={deletingSelected} onclick={requestDeleteSelected}><Trash2 data-icon="inline-start" />Delete {selectedIds.length}</Button>{/if}</div>
		</div>

		<div class="mt-2 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[760px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="w-9 px-3 py-2"></th><th class="px-3 py-2">Sender / mailbox</th><th class="px-3 py-2">Subject</th><th class="px-3 py-2">User</th><th class="px-3 py-2">Status</th><th class="px-3 py-2 text-right">Date</th></tr></thead>
				<tbody class="divide-y">
					{#each scopedMessages as message (message.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-3 py-3"><Checkbox checked={selectedIds.includes(message.id)} onCheckedChange={() => toggleSelected(message.id)} aria-label={`Select ${message.subject}`} /></td>
							<td class="max-w-[210px] px-3 py-3"><span class="block truncate font-medium">{message.from}</span><span class="mt-1 block truncate text-[9px] text-muted-foreground">{message.folder === 'sent' ? message.address : (message.recipients?.[0] ?? '')}</span></td>
							<td class="max-w-[420px] px-3 py-3"><a href="/mail/{message.id}?from=all-mail" class="block truncate font-medium hover:underline">{message.subject}</a><span class="mt-1 block truncate text-[9px] text-muted-foreground">{message.preview}</span></td>
							<td class="px-3 py-3 text-muted-foreground">{message.ownerEmail ?? '—'}</td>
							<td class="px-3 py-3"><Badge variant={statusLabel(message, !!message.deleted) === 'Bounced' ? 'destructive' : statusLabel(message, !!message.deleted) === 'Delayed' ? 'outline' : 'secondary'} class="h-5 rounded-full px-2 text-[9px]">{statusLabel(message, !!message.deleted)}</Badge></td>
							<td class="px-3 py-3 text-right text-[9px] tabular-nums text-muted-foreground">{message.date}</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="px-4 py-14 text-center text-xs text-muted-foreground">{#if loading}<div class="flex justify-center"><LoadingState label="Loading messages…" /></div>{:else}No messages match these filters.{/if}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if statusNotice}<p class="mt-3 text-[10px] text-destructive" role="alert">{statusNotice}</p>{/if}
		{#if page > 1 || hasMore}
			<div class="mt-3 flex items-center justify-between gap-3">
				<Button variant="outline" size="sm" disabled={page <= 1 || loading} onclick={previousPage}>Previous</Button>
				<span class="text-[10px] tabular-nums text-muted-foreground">Page {page} · {pageStart}–{pageEnd} of {total}</span>
				<Button variant="outline" size="sm" disabled={!hasMore || loading} onclick={nextPage}>Next</Button>
			</div>
		{/if}
	</div>
</section>

{#if showCleanup && canDeleteAllEmail}
	<Dialog.Root bind:open={showCleanup}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[440px] gap-0 p-5">
			<Dialog.Header class="flex-row items-start justify-between">
				<div><Dialog.Title id="cleanup-title" class="text-sm font-semibold">{cleanupReview ? 'Confirm bulk cleanup' : 'Bulk cleanup'}</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-muted-foreground">{cleanupReview ? 'This permanently deletes every message matching the filters you entered. This action cannot be undone.' : 'Set filters for the messages you want to delete.'}</Dialog.Description></div>
				<Button variant="ghost" size="icon-xs" aria-label="Close" disabled={cleaning} onclick={() => { showCleanup = false; cleanupReview = false; }}><X data-icon="inline-start" /></Button>
			</Dialog.Header>
			{#if cleanupReview}
				<div class="mt-4 rounded-lg border bg-muted/30 p-3 text-[10px] leading-relaxed">
					<p class="mb-2 font-medium">Delete messages matching:</p>
					<div class="flex flex-col gap-1 text-muted-foreground">
						{#if cleanupSender.trim()}<p>Sender name: {cleanupSender}</p>{/if}
						{#if cleanupSubject.trim()}<p>Subject: {cleanupSubject}</p>{/if}
						{#if cleanupMailbox.trim()}<p>Sender address: {cleanupMailbox}</p>{/if}
						{#if cleanupRecipient.trim()}<p>Recipient address: {cleanupRecipient}</p>{/if}
						{#if cleanupStart || cleanupEnd}<p>Date: {cleanupStart || 'Any'} through {cleanupEnd || 'Any'}</p>{/if}
						<p>Text matching: {cleanupMatch}</p>
					</div>
				</div>
				<div class="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" disabled={cleaning} onclick={() => (cleanupReview = false)}>Back</Button><Button type="button" variant="destructive" size="sm" class="rounded-full" disabled={cleaning} onclick={() => { void confirmCleanup(); }}>{#if cleaning}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{cleaning ? 'Deleting…' : 'Permanently delete'}</Button></div>
			{:else}
			<form class="mt-4 space-y-2.5" onsubmit={applyCleanup}>
				<Input bind:value={cleanupSender} placeholder="Sender name prefix" class="h-9 text-xs" />
				<Input bind:value={cleanupSubject} placeholder="Subject contains" class="h-9 text-xs" />
				<Input bind:value={cleanupMailbox} placeholder="Sender address" class="h-9 text-xs" />
				<Input bind:value={cleanupRecipient} placeholder="Recipient address" class="h-9 text-xs" />
				<div class="grid grid-cols-2 gap-2"><label class="space-y-1 text-[10px]">From date<Input bind:value={cleanupStart} type="date" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">To date<Input bind:value={cleanupEnd} type="date" class="h-9 text-xs" /></label></div>
				<div class="flex items-center justify-between gap-3 pt-2"><SelectControl bind:value={cleanupMatch} items={[{ value: 'equals', label: 'Exact match' }, { value: 'starts-with', label: 'Starts with' }, { value: 'contains', label: 'Contains' }]} aria-label="Text matching rule" class="h-9 text-[10px]" /><div class="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showCleanup = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Review matches</Button></div></div>
			</form>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if confirmSelectedDeleteOpen}
	<Dialog.Root bind:open={confirmSelectedDeleteOpen}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[400px] gap-0 p-5">
			<Dialog.Header><Dialog.Title class="text-sm font-semibold">Permanently delete {selectedIds.length} messages?</Dialog.Title><Dialog.Description class="mt-1 text-[11px] leading-relaxed">The selected messages will be permanently deleted from all mailboxes. This action cannot be undone.</Dialog.Description></Dialog.Header>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" class="rounded-full" disabled={deletingSelected} onclick={() => (confirmSelectedDeleteOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" class="rounded-full" disabled={deletingSelected} onclick={() => { void deleteSelected(); }}>{#if deletingSelected}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{deletingSelected ? 'Deleting…' : 'Permanently delete'}</Button></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
