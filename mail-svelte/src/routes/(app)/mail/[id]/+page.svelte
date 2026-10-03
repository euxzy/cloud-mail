<script lang="ts">
	import { Archive, ArrowLeft, Download, FileText, Image, Star, Trash2, X } from '@lucide/svelte';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { mailMessages, type MailAttachment } from '$lib/mail-data.svelte.js';
	import { showComposer } from '$lib/mail-ui.svelte.js';

	const message = $derived(mailMessages.find((item) => item.id === page.params.id) ?? null);
	const backHref = $derived(
		page.url.searchParams.get('from') === 'starred'
			? '/starred'
			: page.url.searchParams.get('from') === 'all-mail'
				? '/all-mail'
				: message?.folder === 'sent'
					? '/sent'
					: message?.folder === 'drafts'
						? '/draft'
						: '/inbox'
	);
	let deleteOpen = $state(false);
	let actionNotice = $state('');
	let previewAttachment = $state<MailAttachment | null>(null);
	let previewUrl = $state('');

	$effect(() => {
		if (message?.folder === 'inbox') message.read = true;
	});

	onDestroy(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});

	function toggleStar() {
		if (message) message.starred = !message.starred;
	}

	function archiveMessage() {
		if (!message) return;
		message.archived = true;
		goto('/inbox');
	}

	function deleteMessage() {
		if (!message) return;
		const index = mailMessages.findIndex((item) => item.id === message.id);
		if (index >= 0) mailMessages.splice(index, 1);
		deleteOpen = false;
		goto(backHref);
	}

	function reply() {
		if (!message) return;
		const recipient = message.folder === 'sent' ? (message.recipients?.[0] ?? '') : message.address;
		const quotedBody = message.body.join('\n').split('\n').map((line) => `> ${line}`).join('\n');
		showComposer(recipient, `Re: ${message.subject}`, `\n\nOn ${message.date}, ${message.from} wrote:\n${quotedBody}`);
	}

	function forward() {
		if (!message) return;
		const forwardedBody = message.body.join('\n').split('\n').map((line) => `> ${line}`).join('\n');
		showComposer('', `Fwd: ${message.subject}`, `\n\n---------- Forwarded message ----------\nFrom: ${message.from} <${message.address}>\nDate: ${message.date}\nSubject: ${message.subject}\n\n${forwardedBody}`);
	}

	function showAttachment(attachment: MailAttachment) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewAttachment = attachment;
		previewUrl = attachment.file?.type.startsWith('image/') ? URL.createObjectURL(attachment.file) : '';
	}

	function closePreview() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = '';
		previewAttachment = null;
	}

	function downloadAttachment(attachment: MailAttachment) {
		if (!attachment.file) {
			actionNotice = 'This sample attachment is not connected to object storage.';
			return;
		}
		const url = URL.createObjectURL(attachment.file);
		const link = document.createElement('a');
		link.href = url;
		link.download = attachment.filename;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function formatBytes(bytes: number) {
		return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<section class="min-h-full px-3 pb-10 pt-3 sm:px-6 sm:pt-4 lg:px-8">
	<div class="flex items-center justify-between border-b pb-2">
		<div class="flex items-center gap-1">
			<Button href={backHref} variant="ghost" size="icon-sm" aria-label="Back to mail list"><ArrowLeft data-icon="inline-start" /></Button>
			{#if message}
				<Button variant="ghost" size="icon-sm" aria-label="Archive message" onclick={archiveMessage}><Archive data-icon="inline-start" /></Button>
				<Button variant="ghost" size="icon-sm" aria-label="Delete message" onclick={() => (deleteOpen = true)}><Trash2 data-icon="inline-start" /></Button>
			{/if}
		</div>
		{#if message}<span class="text-[10px] tabular-nums text-muted-foreground">{message.date}</span>{/if}
	</div>

	{#if message}
		<article class="mx-auto max-w-[900px] pt-6 sm:pt-9">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="flex min-w-0 flex-wrap items-center gap-2">
					<h1 class="text-[26px] font-semibold leading-tight tracking-[-0.05em] sm:text-[32px]">{message.subject}</h1>
					{#if message.label}<Badge variant="secondary" class="h-5 rounded px-1.5 text-[10px] font-medium text-muted-foreground">{message.label}</Badge>{/if}
					{#if message.status}<Badge variant={message.status === 'bounced' ? 'destructive' : 'outline'} class="h-5 rounded-full px-2 text-[9px]">{message.status}</Badge>{/if}
				</div>
				<Button variant="ghost" size="icon-sm" aria-label={message.starred ? 'Remove star' : 'Add star'} aria-pressed={message.starred} onclick={toggleStar}>
					<Star fill={message.starred ? 'currentColor' : 'none'} data-icon="inline-start" />
				</Button>
			</div>

			{#if message.status === 'bounced' || message.status === 'complained' || message.status === 'delayed'}
				<div class="mt-4 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed {message.status === 'bounced' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-amber-500/30 bg-amber-500/5 text-foreground'}" role="status">
					<p class="font-semibold">{message.status === 'bounced' ? 'Delivery failed' : message.status === 'complained' ? 'Recipient reported this message' : 'Delivery delayed'}</p>
					<p class="mt-0.5 text-muted-foreground">{message.statusMessage ?? 'Check the message delivery status for more information.'}</p>
				</div>
			{/if}

			<div class="mt-6 flex items-start gap-3">
				<Avatar.Root size="default"><Avatar.Fallback class="bg-muted text-[11px] font-semibold">{message.initials}</Avatar.Fallback></Avatar.Root>
				<div class="min-w-0 pt-0.5">
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						<span class="text-xs font-semibold">{message.from}</span>
						<span class="text-[11px] text-muted-foreground">&lt;{message.address}&gt;</span>
					</div>
					<p class="mt-1 text-[10px] text-muted-foreground">to {message.recipients?.join(', ') || 'No recipient'}</p>
				</div>
			</div>

			<Separator class="my-5" />
			<div class="max-w-[720px] space-y-4 text-sm leading-[1.85] text-foreground/85">
				{#each message.body as paragraph, index (index)}<p class="whitespace-pre-line">{paragraph}</p>{/each}
			</div>

			{#if message.attachments?.length}
				<section class="mt-8 max-w-[720px] rounded-xl border p-3 sm:p-4" aria-label="Attachments">
					<div class="flex items-center justify-between"><h2 class="text-[11px] font-semibold">Attachments</h2><span class="text-[10px] text-muted-foreground">{message.attachments.length} files</span></div>
					<div class="mt-3 grid gap-2 sm:grid-cols-2">
						{#each message.attachments as attachment (attachment.filename)}
							<div class="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 p-2.5">
								<span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">{#if attachment.contentType?.startsWith('image/')}<Image size={15} />{:else}<FileText size={15} />{/if}</span>
								<div class="min-w-0 flex-1"><p class="truncate text-[10px] font-medium">{attachment.filename}</p><p class="mt-0.5 text-[9px] text-muted-foreground">{formatBytes(attachment.size)}</p></div>
								<Button variant="ghost" size="icon-xs" aria-label={`Preview ${attachment.filename}`} onclick={() => showAttachment(attachment)}><Image data-icon="inline-start" /></Button>
								<Button variant="ghost" size="icon-xs" aria-label={`Download ${attachment.filename}`} onclick={() => downloadAttachment(attachment)}><Download data-icon="inline-start" /></Button>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<div class="mt-8 flex items-center gap-2">
				<Button variant="outline" class="rounded-full px-4" onclick={reply}><ArrowLeft class="rotate-180" data-icon="inline-start" />Reply</Button>
				<Button variant="ghost" class="rounded-full px-4 text-muted-foreground" onclick={forward}>Forward</Button>
			</div>
			{#if actionNotice}<p role="status" class="mt-3 text-[10px] text-muted-foreground">{actionNotice}</p>{/if}
		</article>
	{:else}
		<div class="mx-auto max-w-lg py-16 text-center">
			<h1 class="text-lg font-medium">Message not found</h1>
			<p class="mt-2 text-xs text-muted-foreground">This message may have been deleted or is unavailable in the preview.</p>
			<Button href="/inbox" variant="outline" class="mt-5 rounded-full">Back to inbox</Button>
		</div>
	{/if}
</section>

{#if previewAttachment}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close attachment preview" onclick={closePreview}></button>
		<section role="dialog" aria-modal="true" aria-labelledby="attachment-title" class="relative z-10 w-full max-w-[640px] overflow-hidden rounded-2xl border bg-background shadow-xl">
			<header class="flex items-center justify-between border-b px-4 py-3"><div class="min-w-0"><h2 id="attachment-title" class="truncate text-xs font-semibold">{previewAttachment.filename}</h2><p class="mt-0.5 text-[9px] text-muted-foreground">{formatBytes(previewAttachment.size)}</p></div><Button variant="ghost" size="icon-xs" aria-label="Close preview" onclick={closePreview}><X data-icon="inline-start" /></Button></header>
			<div class="flex min-h-[240px] max-h-[70svh] items-center justify-center overflow-auto bg-muted/20 p-4">
				{#if previewUrl}<img src={previewUrl} alt={previewAttachment.filename} class="max-h-[62svh] max-w-full object-contain" />{:else}<div class="max-w-[300px] text-center"><FileText class="mx-auto text-muted-foreground" size={28} /><p class="mt-3 text-xs font-medium">Attachment preview</p><p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">The sample includes file details only. The original file is available when connected to the mail service.</p></div>{/if}
			</div>
			<footer class="flex justify-end border-t p-3"><Button variant="outline" size="sm" class="rounded-full" onclick={() => downloadAttachment(previewAttachment!)}><Download data-icon="inline-start" />Download</Button></footer>
		</section>
	</div>
{/if}

{#if deleteOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close delete confirmation" onclick={() => (deleteOpen = false)}></button>
		<section role="dialog" aria-modal="true" aria-labelledby="delete-message-title" class="relative z-10 w-full max-w-[380px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="delete-message-title" class="text-sm font-semibold">Delete this message?</h2><p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">This message will be removed from the local preview.</p>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" class="rounded-full" onclick={() => (deleteOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" class="rounded-full" onclick={deleteMessage}>Delete message</Button></div>
		</section>
	</div>
{/if}
