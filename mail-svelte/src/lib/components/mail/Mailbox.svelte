<script lang="ts">
	import { ArrowDown, ArrowUp, CheckCheck, CornerUpLeft, Forward, LoaderCircle, RefreshCw, Search, Star, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { mailMessages, type Folder, type MailMessage } from '$lib/mail-data.svelte.js';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';
	import { formatImage } from '$lib/mail-settings.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { goto } from '$app/navigation';
	import { deleteApiEmails, markApiEmailsRead, setApiEmailStar } from '$lib/api/mail.js';
	import { deleteDrafts } from '$lib/draft-store.js';
	import { plainTextToHtml, sanitizeRichHtml } from '$lib/rich-text.js';
	import { toast } from 'svelte-sonner';

	type Props = { folder: Folder };
	let { folder }: Props = $props();
	let unreadOnly = $state(false);
	let newestFirst = $state(true);
	let selectedIds = $state<string[]>([]);
	let deleteConfirmOpen = $state(false);
	let pendingDeleteIds = $state<string[]>([]);
	let context = $state<{ id: string; x: number; y: number } | null>(null);
	let starLoadingId = $state<string | null>(null);
	let bulkAction = $state<'read' | 'delete' | null>(null);
	const folderTitle = $derived(
		({ inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts' } as Record<Folder, string>)[folder]
	);
	const unreadCount = $derived(mailMessages.filter((message) => message.folder === 'inbox' && !message.deleted && !message.read).length);
	const filteredMessages = $derived.by(() => {
		const query = mailUi.query.trim().toLowerCase();
		const filtered = mailMessages.filter((message) => {
			if (message.deleted) return false;
			const inFolder = folder === 'starred' ? message.starred : message.folder === folder;
			const matchesQuery = !query || `${message.from} ${message.address} ${message.subject} ${message.preview} ${(message.recipients ?? []).join(' ')}`.toLowerCase().includes(query);
			return inFolder && matchesQuery && (!unreadOnly || !message.read);
		});
		return newestFirst ? filtered : [...filtered].reverse();
	});
	const visibleMessages = $derived(filteredMessages);
	const selectedVisibleCount = $derived(visibleMessages.filter((message) => selectedIds.includes(message.id)).length);
	const allSelected = $derived(visibleMessages.length > 0 && selectedVisibleCount === visibleMessages.length);
	const someSelected = $derived(selectedVisibleCount > 0 && !allSelected);
	const canDelete = $derived(hasPermission(folder === 'drafts' ? 'Send email' : 'Delete messages'));
	$effect(() => {
		folder;
		mailUi.currentAccountId;
		mailUi.mailboxPage;
		mailUi.refreshKey;
		selectedIds = [];
	});

	function previousPage() {
		if (mailUi.mailboxPage <= 1 || mailUi.mailboxLoading) return;
		selectedIds = [];
		mailUi.mailboxPage -= 1;
	}

	function nextPage() {
		if (!mailUi.mailboxHasMore || mailUi.mailboxLoading) return;
		selectedIds = [];
		mailUi.mailboxPage += 1;
	}

	async function toggleStar(id: string) {
		const message = mailMessages.find((item) => item.id === id);
		if (!message || starLoadingId !== null) return false;
		const starred = !message.starred;
		starLoadingId = id;
		try {
			await setApiEmailStar(id, starred);
			message.starred = starred;
			toast.success(starred ? 'Message starred.' : 'Message removed from starred.');
			return true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Star status could not be changed.');
			return false;
		}
		finally { starLoadingId = null; }
	}

	function toggleSelected(id: string) {
		selectedIds = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
	}

	function toggleAllVisible() {
		if (allSelected) {
			const visibleIds = new Set(visibleMessages.map((message) => message.id));
			selectedIds = selectedIds.filter((id) => !visibleIds.has(id));
		} else {
			selectedIds = [...new Set([...selectedIds, ...visibleMessages.map((message) => message.id)])];
		}
	}

	async function markSelectedRead() {
		if (bulkAction) return;
		const ids = [...selectedIds];
		bulkAction = 'read';
		try { await markApiEmailsRead(ids); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Messages could not be marked as read.'); bulkAction = null; return; }
		for (const message of mailMessages) {
			if (ids.includes(message.id)) message.read = true;
		}
		selectedIds = [];
		toast.success('Selected messages marked as read.');
		bulkAction = null;
	}

	function confirmSelectedDelete() {
		if (!canDelete || bulkAction || !selectedIds.length) return;
		pendingDeleteIds = [...selectedIds];
		context = null;
		deleteConfirmOpen = true;
	}

	function confirmContextDelete(message: MailMessage) {
		if (!canDelete || bulkAction) return;
		pendingDeleteIds = [message.id];
		context = null;
		deleteConfirmOpen = true;
	}

	async function deletePendingMessages() {
		if (!canDelete || bulkAction || !pendingDeleteIds.length) return;
		const ids = [...pendingDeleteIds];
		bulkAction = 'delete';
		try {
			if (folder === 'drafts') await deleteDrafts(ids);
			else await deleteApiEmails(ids);
			for (const message of mailMessages) if (ids.includes(message.id)) message.deleted = true;
			selectedIds = [];
			pendingDeleteIds = [];
			deleteConfirmOpen = false;
			const itemName = folder === 'drafts' ? 'draft' : 'message';
			toast.success(ids.length > 1 ? `Selected ${itemName}s deleted.` : `${itemName[0].toUpperCase()}${itemName.slice(1)} deleted.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Messages could not be deleted.');
		} finally { bulkAction = null; }
	}

	async function openMessage(event: MouseEvent, message: MailMessage) {
		if (folder === 'drafts') {
			event.preventDefault();
			showComposer(
				(message.recipients ?? []).join(', '),
				message.subject === '(No subject)' ? '' : message.subject,
				message.body.join('\n'),
				message.id
			);
			return;
		}
		if (folder === 'inbox' && !message.read) {
			if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			try { await markApiEmailsRead([message.id]); message.read = true; }
			catch (error) { toast.error(error instanceof Error ? error.message : 'Message could not be marked as read.'); return; }
			await goto(`/mail/${message.id}?from=${folder}`);
		}
	}

	async function markContextRead(message: MailMessage) {
		try { await markApiEmailsRead([message.id]); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Message could not be marked as read.'); return; }
		message.read = true;
		context = null;
	}

	async function toggleContextStar(message: MailMessage) {
		if (await toggleStar(message.id)) context = null;
	}

	function openContext(event: MouseEvent, message: MailMessage) {
		event.preventDefault();
		context = { id: message.id, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 205)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 260)) };
	}

	function replyTo(message: MailMessage) {
		const attribution = `On ${message.date}, ${message.from} wrote:`;
		const quotedHtml = message.htmlBody ? sanitizeRichHtml(formatImage(message.htmlBody)) : plainTextToHtml(message.body.join('\n'));
		const bodyHtml = `<p><br></p><blockquote><p>${attribution.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>${quotedHtml}</blockquote>`;
		showComposer(
			message.folder === 'sent' ? message.recipients?.[0] ?? '' : message.address,
			`Re: ${message.subject}`,
			`${attribution}\n\n${message.body.join('\n')}`,
			'',
			bodyHtml,
			true
		);
		context = null;
	}

	function forwardMessage(message: MailMessage) {
		const quotedHtml = message.htmlBody ? sanitizeRichHtml(formatImage(message.htmlBody)) : plainTextToHtml(message.body.join('\n'));
		const header = `---------- Forwarded message ----------\nFrom: ${message.from} <${message.address}>\nSubject: ${message.subject}`;
		const safeHeader = header.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
		showComposer('', `Fwd: ${message.subject}`, `${header}\n\n${message.body.join('\n')}`, '', `<p><br></p><blockquote><p>${safeHeader}</p>${quotedHtml}</blockquote>`, true);
		context = null;
	}

	function displayName(message: MailMessage) {
		if (folder === 'drafts') return message.recipients?.join(', ') || 'No recipients';
		if (folder === 'sent') return message.recipients?.join(', ') || 'No recipients';
		return message.from;
	}

	function statusLabel(message: MailMessage) {
		return ({ sent: 'Sent', delivered: 'Delivered', bounced: 'Bounced', complained: 'Complaint', delayed: 'Delayed', failed: 'Failed', 'no-recipient': 'No recipient' } as const)[message.status ?? 'delivered'];
	}
</script>

<section class="min-h-full px-3 pb-8 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="flex items-center justify-between gap-3 pb-6">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<h1 class="truncate text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">{folderTitle}</h1>
				{#if folder === 'inbox' && unreadCount > 0}
					<Badge variant="secondary" class="h-6 rounded-lg px-2.5 text-[11px] font-semibold">{unreadCount} unread</Badge>
				{/if}
			</div>
			<p class="mt-1 text-[13px] text-muted-foreground">{folder === 'inbox' ? 'The conversations that matter, all in one place.' : 'Your messages, neatly organized.'}</p>
		</div>
		<Button size="sm" class="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold lg:hidden" onclick={() => showComposer()}>Compose</Button>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" aria-pressed={!unreadOnly} class="rounded-lg px-3 text-xs {!unreadOnly ? 'bg-secondary font-semibold text-secondary-foreground hover:bg-secondary' : 'text-muted-foreground'}" onclick={() => (unreadOnly = false)}>All mail</Button>
			<Button variant="ghost" size="sm" aria-pressed={unreadOnly} class="rounded-lg px-3 text-xs {unreadOnly ? 'bg-secondary font-semibold text-secondary-foreground hover:bg-secondary' : 'text-muted-foreground'}" onclick={() => (unreadOnly = true)}>Unread</Button>
		</div>
		<div class="flex items-center gap-1">
			<span class="px-2 text-[11px] tabular-nums text-muted-foreground">{filteredMessages.length} messages on this page</span>
			<Button variant="ghost" size="icon-sm" aria-label={newestFirst ? 'Sort oldest first' : 'Sort newest first'} onclick={() => (newestFirst = !newestFirst)}>
				{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}
			</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh message list" disabled={mailUi.mailboxLoading} onclick={() => { selectedIds = []; unreadOnly = false; mailUi.refreshKey += 1; }}>{#if mailUi.mailboxLoading}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<RefreshCw data-icon="inline-start" />{/if}</Button>
		</div>
	</div>

	{#if visibleMessages.length}
		<div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b px-2 py-1.5 text-[11px]">
			<div class="flex items-center gap-2 text-muted-foreground"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={toggleAllVisible} aria-label="Select all messages on this page" /><span>Select all on this page</span></div>
			{#if selectedIds.length}
				<div class="flex flex-wrap items-center gap-1.5"><span class="mr-1 text-muted-foreground">{selectedIds.length} selected</span>
					{#if folder === 'inbox'}<Button variant="ghost" size="xs" class="text-muted-foreground" disabled={bulkAction !== null} onclick={() => { void markSelectedRead(); }}>{#if bulkAction === 'read'}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<CheckCheck data-icon="inline-start" />{/if}{bulkAction === 'read' ? 'Marking…' : 'Mark read'}</Button>{/if}
					{#if canDelete}<Button variant="ghost" size="xs" class="text-destructive" disabled={bulkAction !== null} onclick={confirmSelectedDelete}><Trash2 data-icon="inline-start" />Delete</Button>{/if}
				</div>
			{/if}
		</div>
		<div class="divide-y divide-border/70">
			{#each visibleMessages as message (message.id)}
				<div role="group" class="group relative flex items-start gap-1.5 rounded-lg px-1 transition-colors hover:bg-muted/65 sm:items-center sm:gap-2 {message.read ? '' : 'bg-secondary/20'}" oncontextmenu={(event) => openContext(event, message)}>
					{#if !message.read}<span class="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-primary"></span>{/if}
					<Checkbox checked={selectedIds.includes(message.id)} onCheckedChange={() => toggleSelected(message.id)} class="ml-2 mt-[17px] shrink-0 sm:mt-0" aria-label={`Select ${message.subject}`} />
					{#if folder !== 'drafts'}
						<Button variant="ghost" size="icon-sm" class="mt-2 shrink-0 text-muted-foreground sm:mt-0" aria-label={message.starred ? 'Remove star' : 'Add star'} aria-pressed={message.starred} disabled={starLoadingId !== null} onclick={() => { void toggleStar(message.id); }}>
							{#if starLoadingId === message.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Star fill={message.starred ? 'currentColor' : 'none'} data-icon="inline-start" />{/if}
						</Button>
					{/if}
					<a
						href="/mail/{message.id}?from={folder}"
						class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_58px] gap-x-3 gap-y-1.5 rounded-md py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(135px,205px)_minmax(0,1fr)_76px] sm:items-center sm:gap-y-0 sm:py-4"
						onclick={(event) => openMessage(event, message)}
					>
						<span class="col-start-1 row-start-1 truncate text-[13px] {message.read ? 'font-medium text-foreground/85' : 'font-semibold text-foreground'}">{displayName(message)}</span>
						<span class="col-start-2 row-start-1 text-right text-[11px] tabular-nums {message.read ? 'text-muted-foreground' : 'font-semibold text-foreground'}">{message.time}</span>
						<span class="col-span-2 row-start-2 min-w-0 truncate text-[12px] sm:col-span-1 sm:col-start-2 sm:row-start-1">
							<span class="{message.read ? 'font-normal' : 'font-semibold'}">{message.subject}</span>
							<span class="hidden text-muted-foreground sm:inline"> — {message.preview}</span>
							{#if message.label}<span class="ml-2 hidden rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground lg:inline">{message.label}</span>{/if}
							{#if folder === 'sent' && message.status}<span class="ml-2 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{statusLabel(message)}</span>{/if}
						</span>
						<span class="col-span-2 row-start-3 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground sm:hidden">{message.preview}</span>
					</a>
				</div>
			{/each}
		</div>
	{:else if mailUi.mailboxLoading}
		<div class="flex justify-center py-12"><LoadingState label="Loading emails…" /></div>
	{:else}
		<Empty.Root class="min-h-[280px] border-0">
			<Empty.Media variant="icon"><Search /></Empty.Media>
			<Empty.Header>
				<Empty.Title class="text-sm">No messages found</Empty.Title>
				<Empty.Description class="max-w-[250px] text-xs">Try another search or change the message filter.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}
	{#if mailUi.mailboxPage > 1 || mailUi.mailboxHasMore}
		<div class="mt-5 flex items-center justify-between gap-3 border-t px-1 pt-4">
			<Button variant="outline" size="sm" disabled={mailUi.mailboxPage <= 1 || mailUi.mailboxLoading} onclick={previousPage}>Previous</Button>
			<span class="text-[11px] tabular-nums text-muted-foreground">Page {mailUi.mailboxPage}</span>
			<Button variant="outline" size="sm" disabled={!mailUi.mailboxHasMore || mailUi.mailboxLoading} onclick={nextPage}>Next</Button>
		</div>
	{/if}
</section>

{#if context}
	{@const target = mailMessages.find((message) => message.id === context?.id)}
	<div class="fixed inset-0 z-40" role="presentation"><button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close message menu" onclick={() => (context = null)}></button>{#if target}<div class="fixed z-50 w-[195px] rounded-xl border bg-popover p-1.5 shadow-xl" style={`left:${context.x}px;top:${context.y}px`}>
		{#if folder === 'inbox'}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => { void markContextRead(target); }}><CheckCheck size={14} />Mark as read</button>{/if}
		{#if folder !== 'drafts' && hasPermission('Send email')}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => replyTo(target)}><CornerUpLeft size={14} />Reply</button><button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => forwardMessage(target)}><Forward size={14} />Forward</button>{/if}{#if folder !== 'drafts'}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => { void toggleContextStar(target); }}><Star size={14} />{target.starred ? 'Remove star' : 'Star'}</button>{/if}
		{#if canDelete}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] text-destructive hover:bg-muted" onclick={() => confirmContextDelete(target)}><Trash2 size={14} />Delete</button>{/if}
	</div>{/if}</div>
{/if}

<Dialog.Root bind:open={deleteConfirmOpen}>
	<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[400px] gap-0 p-5">
		<Dialog.Header>
			<Dialog.Title class="text-sm font-semibold">{pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length} messages?` : folder === 'drafts' ? 'Delete this draft?' : 'Delete this message?'}</Dialog.Title>
			<Dialog.Description class="mt-1 text-[11px] leading-relaxed">{folder === 'drafts' ? 'This will permanently remove the selected draft from your drafts.' : 'This will remove the selected message from your mailbox.'}{pendingDeleteIds.length > 1 ? ` ${pendingDeleteIds.length} messages are selected.` : ''}</Dialog.Description>
		</Dialog.Header>
		<div class="mt-5 flex justify-end gap-2">
			<Button variant="ghost" size="sm" class="rounded-full" disabled={bulkAction === 'delete'} onclick={() => (deleteConfirmOpen = false)}>Cancel</Button>
			<Button variant="destructive" size="sm" class="rounded-full" disabled={bulkAction === 'delete'} onclick={() => { void deletePendingMessages(); }}>{#if bulkAction === 'delete'}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{bulkAction === 'delete' ? 'Deleting…' : 'Delete'}</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
