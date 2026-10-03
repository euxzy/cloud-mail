<script lang="ts">
	import { ArrowDown, ArrowUp, CheckCheck, CornerUpLeft, Forward, RefreshCw, Search, Star, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { mailMessages, type Folder, type MailMessage } from '$lib/mail-data.svelte.js';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { hasPreviewPermission, previewSession } from '$lib/preview-state.svelte.js';

	type Props = { folder: Folder };
	let { folder }: Props = $props();
	let unreadOnly = $state(false);
	let newestFirst = $state(true);
	let selectedIds = $state<string[]>([]);
	let context = $state<{ id: string; x: number; y: number } | null>(null);
	let visibleLimit = $state(30);
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);
	const folderTitle = $derived(
		({ inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts' } as Record<Folder, string>)[folder]
	);
	const unreadCount = $derived(
		mailMessages.filter((message) => message.folder === 'inbox' && !message.deleted && !message.read && !message.archived && (message.recipients ?? []).some((email) => mailAccounts.some((account) => account.ownerEmail === previewSession.email && account.email === email))).length
	);
	const filteredMessages = $derived.by(() => {
		const query = mailUi.query.trim().toLowerCase();
		const currentAccount = mailAccounts.find((account) => account.id === mailUi.currentAccountId);
		const ownAddresses = mailAccounts.filter((account) => account.ownerEmail === previewSession.email).map((account) => account.email);
		const filtered = mailMessages.filter((message) => {
			if (message.deleted) return false;
			const inFolder = folder === 'starred'
				? message.starred && !message.archived
				: message.folder === folder && (folder !== 'inbox' || !message.archived);
			const matchesQuery = !query || `${message.from} ${message.address} ${message.subject} ${message.preview} ${(message.recipients ?? []).join(' ')}`.toLowerCase().includes(query);
			const addresses = currentAccount?.allMail ? ownAddresses : [currentAccount?.email ?? previewSession.email];
			const matchesAccount = folder === 'inbox'
				? (message.recipients ?? []).some((email) => addresses.includes(email))
				: folder === 'starred'
					? ownAddresses.includes(message.address) || (message.recipients ?? []).some((email) => ownAddresses.includes(email))
					: addresses.includes(message.address);
			return inFolder && matchesAccount && matchesQuery && (!unreadOnly || !message.read);
		});
		return newestFirst ? filtered : [...filtered].reverse();
	});
	const visibleMessages = $derived(filteredMessages.slice(0, visibleLimit));
	const allSelected = $derived(visibleMessages.length > 0 && visibleMessages.every((message) => selectedIds.includes(message.id)));

	$effect(() => { folder; mailUi.query; unreadOnly; newestFirst; visibleLimit = 30; });
	$effect(() => {
		if (!loadMoreSentinel) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) visibleLimit = Math.min(filteredMessages.length, visibleLimit + 30);
		});
		observer.observe(loadMoreSentinel);
		return () => observer.disconnect();
	});

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
		if (!hasPreviewPermission('Delete messages')) return;
		for (const message of mailMessages) if (selectedIds.includes(message.id)) message.deleted = true;
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

	function openContext(event: MouseEvent, message: MailMessage) {
		event.preventDefault();
		context = { id: message.id, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 205)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 260)) };
	}

	function replyTo(message: MailMessage) {
		const quoted = message.body.join('\n').split('\n').map((line) => `> ${line}`).join('\n');
		showComposer(message.folder === 'sent' ? message.recipients?.[0] ?? '' : message.address, `Re: ${message.subject}`, `\n\nOn ${message.date}, ${message.from} wrote:\n${quoted}`);
		context = null;
	}

	function forwardMessage(message: MailMessage) {
		const quoted = message.body.join('\n').split('\n').map((line) => `> ${line}`).join('\n');
		showComposer('', `Fwd: ${message.subject}`, `\n\n---------- Forwarded message ----------\nFrom: ${message.from} <${message.address}>\nSubject: ${message.subject}\n\n${quoted}`);
		context = null;
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
			<span class="px-2 text-[11px] tabular-nums text-muted-foreground">{filteredMessages.length} messages</span>
			<Button variant="ghost" size="icon-sm" aria-label={newestFirst ? 'Sort oldest first' : 'Sort newest first'} onclick={() => (newestFirst = !newestFirst)}>
				{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}
			</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh message list" onclick={() => { selectedIds = []; unreadOnly = false; }}><RefreshCw data-icon="inline-start" /></Button>
		</div>
	</div>

	{#if visibleMessages.length}
		<div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b px-2 py-1.5 text-[11px]">
			<label class="flex items-center gap-2 text-muted-foreground"><Switch checked={allSelected} onCheckedChange={toggleAllVisible} aria-label="Select all visible messages" size="sm" />Select all</label>
			{#if selectedIds.length}
				<div class="flex flex-wrap items-center gap-1.5"><span class="mr-1 text-muted-foreground">{selectedIds.length} selected</span>
					{#if folder === 'inbox'}<Button variant="ghost" size="xs" class="text-muted-foreground" onclick={markSelectedRead}><CheckCheck data-icon="inline-start" />Mark read</Button>{/if}
					{#if hasPreviewPermission('Delete messages')}<Button variant="ghost" size="xs" class="text-destructive" onclick={deleteSelected}><Trash2 data-icon="inline-start" />Delete</Button>{/if}
				</div>
			{/if}
		</div>
		<div class="divide-y divide-border/70">
			{#each visibleMessages as message (message.id)}
				<div role="group" class="group relative flex items-start gap-1.5 rounded-lg px-1 transition-colors hover:bg-muted/65 sm:items-center sm:gap-2 {message.read ? '' : 'bg-secondary/20'}" oncontextmenu={(event) => openContext(event, message)}>
					{#if !message.read}<span class="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-primary"></span>{/if}
					<Switch checked={selectedIds.includes(message.id)} onCheckedChange={() => toggleSelected(message.id)} class="ml-2 mt-[17px] shrink-0 sm:mt-0" aria-label={`Select ${message.subject}`} size="sm" />
					{#if folder !== 'drafts'}
						<Button variant="ghost" size="icon-sm" class="mt-2 shrink-0 text-muted-foreground sm:mt-0" aria-label={message.starred ? 'Remove star' : 'Add star'} aria-pressed={message.starred} onclick={() => toggleStar(message.id)}>
							<Star fill={message.starred ? 'currentColor' : 'none'} data-icon="inline-start" />
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
		<div bind:this={loadMoreSentinel} class="h-4" aria-hidden="true"></div>
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

{#if context}
	{@const target = mailMessages.find((message) => message.id === context?.id)}
	<div class="fixed inset-0 z-40" role="presentation"><button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close message menu" onclick={() => (context = null)}></button>{#if target}<div class="fixed z-50 w-[195px] rounded-xl border bg-popover p-1.5 shadow-xl" style={`left:${context.x}px;top:${context.y}px`}>
		{#if folder === 'inbox'}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => { target.read = true; context = null; }}><CheckCheck size={14} />Mark as read</button>{/if}
		{#if folder !== 'drafts' && hasPreviewPermission('Send email')}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => replyTo(target)}><CornerUpLeft size={14} />Reply</button><button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => forwardMessage(target)}><Forward size={14} />Forward</button>{/if}{#if folder !== 'drafts'}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-muted" onclick={() => { target.starred = !target.starred; context = null; }}><Star size={14} />{target.starred ? 'Remove star' : 'Star'}</button>{/if}
		{#if hasPreviewPermission('Delete messages')}<button type="button" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] text-destructive hover:bg-muted" onclick={() => { target.deleted = true; context = null; }}><Trash2 size={14} />Delete</button>{/if}
	</div>{/if}</div>
{/if}
