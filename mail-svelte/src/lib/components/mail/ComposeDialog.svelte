<script lang="ts">
	import { Bold, ContactRound, Italic, Link2, Paperclip, Send, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { hideComposer, mailUi } from '$lib/mail-ui.svelte.js';
	import { mailMessages, type MailAttachment } from '$lib/mail-data.svelte.js';

	let recipientInput = $state('');
	let recipients = $state<string[]>(mailUi.composeTo ? mailUi.composeTo.split(',').map((email) => email.trim()).filter(Boolean) : []);
	let subject = $state(mailUi.composeSubject);
	let body = $state(mailUi.composeBody);
	const draftId = mailUi.composeDraftId;
	let notice = $state('');
	let contactsOpen = $state(false);
	let attachments = $state<MailAttachment[]>(mailMessages.find((message) => message.id === draftId)?.attachments ?? []);
	let recipientField = $state<HTMLInputElement | null>(null);
	let editor: HTMLTextAreaElement | null = null;
	let attachmentInput: HTMLInputElement | null = null;
	const recentContacts = ['nisa@ruangrupa.co', 'adrian@northstar.studio', 'maya@kawan.id', 'raka@studio-sore.com'];

	function addRecipient(value = recipientInput) {
		const email = value.trim().replace(/,$/, '');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
		if (!recipients.includes(email)) recipients = [...recipients, email];
		recipientInput = '';
	}

	function handleRecipientKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addRecipient();
		}
		if (event.key === 'Backspace' && !recipientInput && recipients.length) recipients = recipients.slice(0, -1);
	}

	function openContacts() {
		contactsOpen = !contactsOpen;
	}

	function addContact(email: string) {
		if (!recipients.includes(email)) recipients = [...recipients, email];
		contactsOpen = false;
		recipientField?.focus();
	}

	function addAttachments(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files) attachments = [...attachments, ...Array.from(input.files).map((file) => ({ filename: file.name, size: file.size, contentType: file.type, file }))];
		input.value = '';
	}

	function removeAttachment(index: number) {
		attachments = attachments.filter((_, current) => current !== index);
	}

	function formatBytes(bytes: number) {
		return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function wrapSelection(marker: string) {
		if (!editor) return;
		const start = editor.selectionStart;
		const end = editor.selectionEnd;
		if (start === end) return;
		body = `${body.slice(0, start)}${marker}${body.slice(start, end)}${marker}${body.slice(end)}`;
		requestAnimationFrame(() => editor?.setSelectionRange(start + marker.length, end + marker.length));
	}

	function insertLink() {
		const selected = editor?.value.slice(editor.selectionStart, editor.selectionEnd);
		if (!selected || !editor) {
			notice = 'Select text in the message first to add a link.';
			return;
		}
		const start = editor.selectionStart;
		const end = editor.selectionEnd;
		const url = window.prompt('Enter a link URL', 'https://');
		if (!url?.trim()) return;
		body = `${body.slice(0, start)}[${selected}](${url.trim()})${body.slice(end)}`;
		requestAnimationFrame(() => editor?.setSelectionRange(start + selected.length + 3, start + selected.length + 3 + url.trim().length));
	}

	function saveDraft() {
		if (!subject.trim() && !recipients.length && !body.trim() && !attachments.length) {
			hideComposer();
			return;
		}
		const id = draftId || 'local-draft';
		const existing = mailMessages.find((message) => message.id === id);
		const draft = {
			id,
			from: 'Sarah Anindya',
			address: 'sarah@cloudmail.id',
			initials: 'SA',
			folder: 'drafts' as const,
			subject: subject || '(No subject)',
			preview: body || recipients.join(', '),
			body: body ? [body] : [],
			recipients: [...recipients],
			attachments: [...attachments],
			time: 'Now',
			date: 'Just now',
			read: true,
			starred: false,
			archived: false
		};
		if (existing) Object.assign(existing, draft);
		else mailMessages.unshift(draft);
		hideComposer();
	}

	function close() {
		saveDraft();
	}

	function prepareMessage(event: SubmitEvent) {
		event.preventDefault();
		if (recipientInput.trim()) addRecipient();
		if (!recipients.length) {
			notice = 'Add at least one recipient before preparing this message.';
			return;
		}
		notice = `Ready for ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}. Connect the send API to deliver this message.`;
	}
</script>

<div class="fixed inset-0 z-50 flex items-end justify-end bg-foreground/15 p-0 backdrop-blur-[1px] sm:p-5" role="presentation">
	<button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close composer" onclick={close}></button>
	<section role="dialog" aria-modal="true" aria-labelledby="compose-title" class="relative z-10 flex max-h-[min(760px,100svh)] w-full flex-col overflow-hidden rounded-t-2xl border bg-background shadow-2xl sm:max-w-[620px] sm:rounded-xl" tabindex="-1">
		<div class="flex shrink-0 items-center justify-between bg-muted/50 px-4 py-3">
			<div><h2 id="compose-title" class="text-xs font-semibold">{draftId ? 'Edit draft' : 'New message'}</h2><p class="mt-0.5 text-[9px] text-muted-foreground">From Sarah Anindya &lt;sarah@cloudmail.id&gt;</p></div>
			<Button variant="ghost" size="icon-xs" aria-label="Close composer" onclick={close}><X data-icon="inline-start" /></Button>
		</div>
		<form class="flex min-h-0 flex-1 flex-col px-4" onsubmit={prepareMessage}>
			<div class="relative flex min-h-11 flex-wrap items-center gap-1.5 border-b py-2 text-xs">
				<span class="mr-1 text-[10px] text-muted-foreground">To</span>
				{#each recipients as email, index (email)}
					<span class="inline-flex max-w-[230px] items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px]"><span class="truncate">{email}</span><button type="button" aria-label={`Remove ${email}`} onclick={() => (recipients = recipients.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>
				{/each}
				<Input bind:ref={recipientField} bind:value={recipientInput} type="text" aria-label="Recipient email" placeholder={recipients.length ? 'Add another recipient' : 'name@example.com'} class="h-7 min-w-[150px] flex-1 border-0 px-0 text-[11px] shadow-none focus-visible:ring-0" onkeydown={handleRecipientKeydown} onblur={() => { if (recipientInput.includes('@') && recipientInput.includes('.')) addRecipient(); }} />
				<div class="relative"><Button type="button" variant="ghost" size="icon-xs" aria-label="Choose recent contacts" onclick={openContacts}><ContactRound data-icon="inline-start" /></Button>{#if contactsOpen}<div class="absolute right-0 top-8 z-20 w-[250px] rounded-xl border bg-popover p-2 shadow-lg"><p class="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Recent contacts</p>{#each recentContacts as contact (contact)}<button type="button" class="block w-full truncate rounded-lg px-2 py-2 text-left text-[10px] hover:bg-muted" onclick={() => addContact(contact)}>{contact}</button>{/each}</div>{/if}</div>
			</div>
			<label class="flex items-center gap-3 border-b py-2.5 text-xs"><span class="w-7 text-[10px] text-muted-foreground">Subject</span><Input bind:value={subject} placeholder="Subject" class="h-8 border-0 px-0 text-xs shadow-none focus-visible:ring-0" /></label>
			<div class="flex items-center gap-1 border-b py-1.5">
				<Button type="button" variant="ghost" size="icon-xs" aria-label="Bold selected text" onclick={() => wrapSelection('**')}><Bold data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="Italicize selected text" onclick={() => wrapSelection('_')}><Italic data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="Add link to selected text" onclick={insertLink}><Link2 data-icon="inline-start" /></Button>
				<span class="ml-auto text-[9px] text-muted-foreground">Plain text preview</span>
			</div>
			<textarea bind:this={editor} bind:value={body} aria-label="Message body" placeholder="Write your message…" rows="9" class="min-h-[180px] flex-1 resize-y bg-transparent py-3 text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-0"></textarea>
			{#if attachments.length}<div class="mb-2 flex flex-wrap gap-2">{#each attachments as file, index (`${file.filename}-${index}`)}<span class="inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1.5 text-[9px]"><span class="max-w-[190px] truncate">{file.filename}</span><span class="text-muted-foreground">{formatBytes(file.size)}</span><button type="button" aria-label={`Remove ${file.filename}`} onclick={() => removeAttachment(index)}>×</button></span>{/each}</div>{/if}
			{#if notice}<p class="mb-2 text-[10px] text-muted-foreground" role="status">{notice}</p>{/if}
			<input bind:this={attachmentInput} type="file" multiple class="hidden" onchange={addAttachments} />
			<div class="flex shrink-0 items-center justify-between gap-3 border-t py-3">
				<div class="flex items-center gap-1"><Button type="submit" size="sm" class="rounded-full px-4">Prepare <Send data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Add attachments" onclick={() => attachmentInput?.click()}><Paperclip data-icon="inline-start" /></Button><span class="hidden text-[9px] text-muted-foreground sm:inline">Attachments are listed in this preview only.</span></div>
				<Button type="button" variant="ghost" size="sm" class="rounded-full text-muted-foreground" onclick={saveDraft}>Save draft</Button>
			</div>
		</form>
	</section>
</div>
