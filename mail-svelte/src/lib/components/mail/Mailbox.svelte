<script lang="ts">
	import { ArrowDown, ArrowUp, CheckCheck, RefreshCw, Search, Star, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { mailMessages, type Folder, type MailMessage } from '$lib/mail-data.svelte.js';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';

	type Props = { folder: Folder };
	let { folder }: Props = $props();
	let unreadOnly = $state(false);
	let newestFirst = $state(true);
	let selectedIds = $state<string[]>([]);
	const folderTitle = $derived(
		({ inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts' } as Record<Folder, string>)[folder]
	);
	const unreadCount = $derived(
		mailMessages.filter((message) => message.folder === 'inbox' && !message.read && !message.archived).length
	);
	const visibleMessages = $derived.by(() => {
		const query = mailUi.query.trim().toLowerCase();
		const filtered = mailMessages.filter((message) => {
			const inFolder = folder === 'starred'
				? message.starred && !message.archived
				: message.folder === folder && (folder !== 'inbox' || !message.archived);
			const matchesQuery = !query || `${message.from} ${message.address} ${message.subject} ${message.preview} ${(message.recipients ?? []).join(' ')}`.toLowerCase().includes(query);
			return inFolder && matchesQuery && (!unreadOnly || !message.read);
		});
		return newestFirst ? filtered : [...filtered].reverse();
	});
	const allSelected = $derived(visibleMessages.length > 0 && visibleMessages.every((message) => selectedIds.includes(message.id)));

	function toggleStar(id: string) {
		const message = mailMessages.find((item) => item.id === id);
		if (message) message.starred = !message.starred;
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

	function markSelectedRead() {
		for (const message of mailMessages) {
			if (selectedIds.includes(message.id)) message.read = true;
		}
		selectedIds = [];
	}

	function deleteSelected() {
		for (let index = mailMessages.length - 1; index >= 0; index -= 1) {
			if (selectedIds.includes(mailMessages[index].id)) mailMessages.splice(index, 1);
		}
		selectedIds = [];
	}

	function openMessage(event: MouseEvent, message: MailMessage) {
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
		message.read = true;
	}

	function displayName(message: MailMessage) {
		if (folder === 'drafts') return message.recipients?.join(', ') || 'No recipients';
		if (folder === 'sent') return message.recipients?.join(', ') || 'No recipients';
		return message.from;
	}

	function statusLabel(message: MailMessage) {
		return ({ queued: 'Queued', delivered: 'Delivered', bounced: 'Bounced', complained: 'Complaint', delayed: 'Delayed' } as const)[message.status ?? 'delivered'];
	}
</script>

<section class="min-h-[calc(100svh-56px)] px-2 pb-8 pt-4 sm:px-4 sm:pt-5 lg:px-5">
	<div class="flex items-center justify-between gap-3 px-2 pb-3 sm:px-1">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<h1 class="truncate text-lg font-normal tracking-[-0.025em]">{folderTitle}</h1>
				{#if folder === 'inbox' && unreadCount > 0}
					<Badge variant="secondary" class="h-5 rounded-full px-2 text-[10px] font-medium text-muted-foreground">{unreadCount} unread</Badge>
				{/if}
			</div>
			<p class="mt-1 text-[11px] text-muted-foreground">Most recent first</p>
		</div>
		<Button size="sm" variant="secondary" class="h-9 shrink-0 rounded-full px-4 text-xs font-semibold lg:hidden" onclick={() => showComposer()}>Compose</Button>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-2 border-y px-2 py-2 sm:px-1">
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" aria-pressed={!unreadOnly} class="rounded-full px-3 text-[11px] {!unreadOnly ? 'bg-secondary font-semibold hover:bg-secondary' : 'text-muted-foreground'}" onclick={() => (unreadOnly = false)}>All</Button>
			<Button variant="ghost" size="sm" aria-pressed={unreadOnly} class="rounded-full px-3 text-[11px] {unreadOnly ? 'bg-secondary font-semibold hover:bg-secondary' : 'text-muted-foreground'}" onclick={() => (unreadOnly = true)}>Unread</Button>
		</div>
		<div class="flex items-center gap-1">
			<span class="px-2 text-[10px] tabular-nums text-muted-foreground">{visibleMessages.length} messages</span>
			<Button variant="ghost" size="icon-sm" aria-label={newestFirst ? 'Sort oldest first' : 'Sort newest first'} onclick={() => (newestFirst = !newestFirst)}>
				{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}
			</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh message list" onclick={() => { selectedIds = []; unreadOnly = false; }}><RefreshCw data-icon="inline-start" /></Button>
		</div>
	</div>

	{#if visibleMessages.length}
		<div class="flex min-h-10 items-center justify-between gap-3 border-b px-2 py-1.5 text-[10px]">
			<label class="flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={allSelected} onchange={toggleAllVisible} class="size-3.5 accent-primary" aria-label="Select all visible messages" />Select all</label>
			{#if selectedIds.length}
				<div class="flex items-center gap-1.5"><span class="mr-1 text-muted-foreground">{selectedIds.length} selected</span>
					{#if folder === 'inbox'}<Button variant="ghost" size="xs" class="text-muted-foreground" onclick={markSelectedRead}><CheckCheck data-icon="inline-start" />Mark read</Button>{/if}
					<Button variant="ghost" size="xs" class="text-destructive" onclick={deleteSelected}><Trash2 data-icon="inline-start" />Delete</Button>
				</div>
			{/if}
		</div>
		<div class="divide-y divide-border/70">
			{#each visibleMessages as message (message.id)}
				<div class="group flex items-start gap-1.5 px-1 hover:bg-muted/60 sm:items-center sm:gap-2">
					<input type="checkbox" checked={selectedIds.includes(message.id)} onchange={() => toggleSelected(message.id)} class="ml-2 mt-[17px] size-3.5 shrink-0 accent-primary sm:mt-0" aria-label={`Select ${message.subject}`} />
					{#if folder !== 'drafts'}
						<Button variant="ghost" size="icon-sm" class="mt-2 shrink-0 text-muted-foreground sm:mt-0" aria-label={message.starred ? 'Remove star' : 'Add star'} aria-pressed={message.starred} onclick={() => toggleStar(message.id)}>
							<Star fill={message.starred ? 'currentColor' : 'none'} data-icon="inline-start" />
						</Button>
					{/if}
					<a
						href="/mail/{message.id}?from={folder}"
						class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_58px] gap-x-3 gap-y-1.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(135px,205px)_minmax(0,1fr)_76px] sm:items-center sm:gap-y-0 sm:py-2.5"
						onclick={(event) => openMessage(event, message)}
					>
						<span class="col-start-1 row-start-1 truncate text-[12px] {message.read ? 'font-normal text-foreground/90' : 'font-semibold text-foreground'}">{displayName(message)}</span>
						<span class="col-start-2 row-start-1 text-right text-[10px] tabular-nums {message.read ? 'text-muted-foreground' : 'font-medium text-foreground'}">{message.time}</span>
						<span class="col-span-2 row-start-2 min-w-0 truncate text-[11px] sm:col-span-1 sm:col-start-2 sm:row-start-1">
							<span class="{message.read ? 'font-normal' : 'font-semibold'}">{message.subject}</span>
							<span class="hidden text-muted-foreground sm:inline"> — {message.preview}</span>
							{#if message.label}<span class="ml-2 hidden rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground lg:inline">{message.label}</span>{/if}
							{#if folder === 'sent' && message.status}<span class="ml-2 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{statusLabel(message)}</span>{/if}
						</span>
						<span class="col-span-2 row-start-3 line-clamp-1 text-[10px] leading-relaxed text-muted-foreground sm:hidden">{message.preview}</span>
					</a>
				</div>
			{/each}
		</div>
	{:else}
		<Empty.Root class="min-h-[280px] border-0">
			<Empty.Media variant="icon"><Search /></Empty.Media>
			<Empty.Header>
				<Empty.Title class="text-sm">No messages found</Empty.Title>
				<Empty.Description class="max-w-[250px] text-xs">Try another search or change the message filter.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}
</section>
