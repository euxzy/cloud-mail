<script lang="ts">
	import { ArrowLeft, Download, FileText, Image, LoaderCircle, Star, Trash2, X } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { mailMessages, type MailAttachment } from '$lib/mail-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import EmailHtmlBody from '$lib/components/mail/EmailHtmlBody.svelte';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { deleteApiEmails, fetchApiAllMessages, fetchApiMessage, fetchApiStarredMessage, markApiEmailsRead, setApiEmailStar } from '$lib/api/mail.js';
	import { assetUrl } from '$lib/api/config.js';
	import { toast } from 'svelte-sonner';

	const message = $derived(mailMessages.find((item) => item.id === page.params.id) ?? null);
	const backHref = $derived(
		page.url.searchParams.get('from') === 'starred'
			? '/starred'
			: page.url.searchParams.get('from') === 'all-mail'
				? '/all-mail'
				: page.url.searchParams.get('from') === 'sent'
					? '/sent'
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
	let loading = $state(false);
	let savingStar = $state(false);
	let deletingMessage = $state(false);
	let loadingMessageId = '';
	let attemptedMessageId = '';
	let detailRequestId = 0;
	let retryKey = $state(0);

	$effect(() => {
		retryKey;
		const id = page.params.id;
		const source = page.url.searchParams.get('from');
		const existingMessage = mailMessages.find((item) => item.id === id);
		if (!id || existingMessage?.htmlBody || loadingMessageId === id || attemptedMessageId === id) return;
		const account = mailAccounts.find((item) => item.id === mailUi.currentAccountId) ?? mailAccounts.find((item) => item.primary);
		if (source !== 'all-mail' && source !== 'starred' && !account) return;
		const currentRequestId = ++detailRequestId;
		attemptedMessageId = id;
		loadingMessageId = id;
		loading = true;
		const request = source === 'all-mail'
			? fetchApiAllMessages({ emailId: Number(id) + 1, size: 50, type: 'all', timeSort: 0 }).then((result) => result.list.find((item) => item.id === id) ?? null)
			: source === 'starred'
				? fetchApiStarredMessage(id)
				: fetchApiMessage(id, source === 'sent' ? 'sent' : 'inbox', account);
		void request.then((found) => {
			if (currentRequestId !== detailRequestId) return;
			actionNotice = '';
			const current = mailMessages.find((item) => item.id === id);
			if (found && current) {
				if (found.htmlBody) current.htmlBody = found.htmlBody;
				if (found.body.length) current.body = found.body;
				if (found.attachments?.length) current.attachments = found.attachments;
			} else if (found) {
				mailMessages.unshift(found);
			} else if (!current) {
				actionNotice = 'Message could not be found in the selected mailbox.';
			}
		}).catch((error) => {
			if (currentRequestId !== detailRequestId) return;
			actionNotice = error instanceof Error ? error.message : 'Message could not be loaded.';
		}).finally(() => {
			if (currentRequestId === detailRequestId) {
				loading = false;
				loadingMessageId = '';
			}
		});
	});

	$effect(() => {
		if (page.url.searchParams.get('from') === 'all-mail' || message?.folder !== 'inbox' || message.read) return;
		const current = message;
		void markApiEmailsRead([current.id]).then(() => { current.read = true; }).catch((error) => {
			actionNotice = error instanceof Error ? error.message : 'Message could not be marked as read.';
		});
	});

	async function toggleStar() {
		if (!message || savingStar) return;
		const starred = !message.starred;
		savingStar = true;
		try { await setApiEmailStar(message.id, starred); message.starred = starred; toast.success(starred ? 'Message starred.' : 'Message removed from starred.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Star status could not be changed.'); }
		finally { savingStar = false; }
	}

	async function deleteMessage() {
		if (!message || deletingMessage) return;
		deletingMessage = true;
		try { await deleteApiEmails([message.id]); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Message could not be deleted.'); deletingMessage = false; return; }
		message.deleted = true;
		deleteOpen = false;
		toast.success('Message deleted.');
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
		previewAttachment = attachment;
		previewUrl = attachment.key && attachment.contentType?.startsWith('image/') ? assetUrl(attachment.key) : '';
	}

	function closePreview() {
		previewUrl = '';
		previewAttachment = null;
	}

	function downloadAttachment(attachment: MailAttachment) {
		if (!attachment.key) {
			toast.error('Attachment is unavailable from the mail service.');
			return;
		}
		const link = document.createElement('a');
		link.href = assetUrl(attachment.key);
		link.download = attachment.filename;
		link.rel = 'noopener';
		link.click();
	}

	function formatBytes(bytes: number) {
		return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function retryMessageLoad() {
		actionNotice = '';
		attemptedMessageId = '';
		loadingMessageId = '';
		retryKey += 1;
	}
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && !previewAttachment && !deleteOpen && !mailUi.composeOpen) void goto(backHref); }} />

<section class="min-h-full px-3 pb-10 pt-3 sm:px-6 sm:pt-4 lg:px-8">
	<div class="flex items-center justify-between border-b pb-2">
		<div class="flex items-center gap-1">
			<Button href={backHref} variant="ghost" size="icon-sm" aria-label="Back to mail list"><ArrowLeft data-icon="inline-start" /></Button>
			{#if message}
				{#if hasPermission('Delete messages')}<Button variant="ghost" size="icon-sm" aria-label="Delete message" disabled={deletingMessage} onclick={() => (deleteOpen = true)}><Trash2 data-icon="inline-start" /></Button>{/if}
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
					{#if message.status}<Badge variant={message.status === 'bounced' || message.status === 'failed' ? 'destructive' : 'outline'} class="h-5 rounded-full px-2 text-[9px]">{message.status}</Badge>{/if}
				</div>
				<Button variant="ghost" size="icon-sm" aria-label={message.starred ? 'Remove star' : 'Add star'} aria-pressed={message.starred} disabled={savingStar} onclick={toggleStar}>
					{#if savingStar}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Star fill={message.starred ? 'currentColor' : 'none'} data-icon="inline-start" />{/if}
				</Button>
			</div>

			{#if message.status === 'bounced' || message.status === 'failed' || message.status === 'complained' || message.status === 'delayed'}
				<div class="mt-4 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed {message.status === 'bounced' || message.status === 'failed' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-amber-500/30 bg-amber-500/5 text-foreground'}" role="status">
					<p class="font-semibold">{message.status === 'bounced' || message.status === 'failed' ? 'Delivery failed' : message.status === 'complained' ? 'Recipient reported this message' : 'Delivery delayed'}</p>
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
			{#if message.htmlBody}
				<EmailHtmlBody html={message.htmlBody} class="max-w-[720px] text-sm leading-[1.85] text-foreground/85" />
			{:else if loading && !message.body.length}
				<div class="max-w-[720px] py-6"><LoadingState label="Loading message content…" /></div>
			{:else}
				<div class="max-w-[720px] space-y-4 text-sm leading-[1.85] text-foreground/85">
					{#each message.body as paragraph, index (index)}<p class="whitespace-pre-line">{paragraph}</p>{/each}
				</div>
			{/if}

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
			{#if actionNotice}<p role="alert" class="mt-3 text-[10px] text-destructive">{actionNotice}</p>{/if}
		</article>
	{:else}
		<div class="mx-auto max-w-lg py-16 text-center">
			{#if loading}<div class="flex justify-center"><LoadingState label="Loading message…" /></div>{:else}<h1 class="text-lg font-medium">Message not found</h1><p role="alert" class="mt-2 text-xs text-destructive">{actionNotice || 'This message may have been deleted or is unavailable.'}</p>{/if}
			<div class="mt-5 flex justify-center gap-2"><Button href={backHref} variant="outline" class="rounded-full">Back to mail</Button>{#if !loading}<Button variant="outline" class="rounded-full" onclick={retryMessageLoad}>Retry</Button>{/if}</div>
		</div>
	{/if}
</section>

{#if previewAttachment}
	<Dialog.Root open={previewAttachment !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[640px] gap-0 overflow-hidden p-0">
			<Dialog.Header class="flex-row items-center justify-between border-b px-4 py-3"><div class="min-w-0"><Dialog.Title id="attachment-title" class="truncate text-xs font-semibold">{previewAttachment.filename}</Dialog.Title><Dialog.Description class="mt-0.5 text-[9px]">{formatBytes(previewAttachment.size)}</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close preview" onclick={closePreview}><X data-icon="inline-start" /></Button></Dialog.Header>
			<div class="flex min-h-[240px] max-h-[70svh] items-center justify-center overflow-auto bg-muted/20 p-4">
				{#if previewUrl}<img src={previewUrl} alt={previewAttachment.filename} class="max-h-[62svh] max-w-full object-contain" />{:else}<div class="max-w-[300px] text-center"><FileText class="mx-auto text-muted-foreground" size={28} /><p class="mt-3 text-xs font-medium">Attachment preview is unavailable</p><p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">This file type cannot be previewed here. Download it to open the attachment.</p></div>{/if}
			</div>
			<footer class="flex justify-end border-t p-3"><Button variant="outline" size="sm" class="rounded-full" onclick={() => downloadAttachment(previewAttachment!)}><Download data-icon="inline-start" />Download</Button></footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if deleteOpen}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content class="w-[calc(100vw-2rem)] max-w-[380px] gap-0 p-5">
			<Dialog.Header><Dialog.Title id="delete-message-title" class="text-sm font-semibold">Delete this message?</Dialog.Title><Dialog.Description class="mt-2 text-[11px] leading-relaxed">This message will be removed from your mailbox.</Dialog.Description></Dialog.Header>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" class="rounded-full" disabled={deletingMessage} onclick={() => (deleteOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" class="rounded-full" disabled={deletingMessage} onclick={deleteMessage}>{#if deletingMessage}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{deletingMessage ? 'Deleting…' : 'Delete message'}</Button></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
