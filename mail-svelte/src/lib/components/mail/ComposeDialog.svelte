<script lang="ts">
	import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, ContactRound, Eraser, Eye, ImagePlus, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, LoaderCircle, Maximize2, Minimize2, MoreHorizontal, Paperclip, Send, Smile, Table2, Underline, X } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Editor } from '@tiptap/core';
	import Blockquote from '@tiptap/extension-blockquote';
	import StarterKit from '@tiptap/starter-kit';
	import Image from '@tiptap/extension-image';
	import { TableKit } from '@tiptap/extension-table';
	import TextAlign from '@tiptap/extension-text-align';
	import { TextStyleKit } from '@tiptap/extension-text-style';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { hideComposer, mailUi } from '$lib/mail-ui.svelte.js';
	import { mailMessages, type MailAttachment, type MailMessage } from '$lib/mail-data.svelte.js';
	import { normalizeRichImage, normalizeRichLink, plainTextToHtml, richBlockquoteStyle, sanitizeRichHtml } from '$lib/rich-text.js';
	import RichMailBody from '$lib/components/mail/RichMailBody.svelte';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { apiUser } from '$lib/api/session.svelte.js';
	import { removeAttachment as removeStoredAttachment, storeAttachment } from '$lib/attachment-store.js';
	import { sendApiEmail } from '$lib/api/mail.js';
	import { deleteDrafts, saveDraft as persistDraft } from '$lib/draft-store.js';
	import { toast } from 'svelte-sonner';

	const draftId = mailUi.composeDraftId;
	const existingDraft = mailMessages.find((message) => message.id === draftId);
	function splitRecipientAddresses(value: string) {
		return value.split(/[,;\n]+/).map((email) => email.trim()).filter(Boolean);
	}
	function isEmailAddress(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}
	let recipientInput = $state('');
	let recipients = $state<string[]>([...new Set((existingDraft?.recipients ?? [mailUi.composeTo]).flatMap(splitRecipientAddresses))]);
	let subject = $state(existingDraft ? (existingDraft.subject === '(No subject)' ? '' : existingDraft.subject) : mailUi.composeSubject);
	let bodyText = $state('');
	let notice = $state('');
	let sending = $state(false);
	let contactsOpen = $state(false);
	let selectedContacts = $state<string[]>([]);
	let linkOpen = $state(false);
	let moreOpen = $state(false);
	let emojiOpen = $state(false);
	let imageOpen = $state(false);
	let tableOpen = $state(false);
	let sourceOpen = $state(false);
	let previewOpen = $state(false);
	let clearConfirmOpen = $state(false);
	let fullscreen = $state(false);
	let imageUrl = $state('');
	let sourceHtml = $state('');
	let fontSize = $state('14px');
	let textColor = $state('#26343a');
	let backgroundColor = $state('#ffffa8');
	let linkUrl = $state('https://');
	let attachments = $state<MailAttachment[]>(existingDraft?.attachments ?? []);
	let recipientField = $state<HTMLInputElement | null>(null);
	let editorContainer = $state<HTMLDivElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let linkInput = $state<HTMLInputElement | null>(null);
	let attachmentInput = $state<HTMLInputElement | null>(null);
	let imageInput = $state<HTMLInputElement | null>(null);
	const currentAccount = $derived(mailAccounts.find((account) => account.id === mailUi.currentAccountId));
	const sender = $derived(currentAccount?.email ?? apiUser.value?.email ?? '');
	const senderName = $derived(currentAccount?.name || currentAccount?.email || apiUser.value?.name || apiUser.value?.email || '');
	const recentContacts = $derived([...new Set(mailMessages.flatMap((message) => [message.address, ...(message.recipients ?? [])]))].filter((email) => email && email !== apiUser.value?.email).slice(0, 500));

	$effect(() => {
		const element = editorContainer;
		if (!element) return;
		const initial = untrack(() => existingDraft?.htmlBody || mailUi.composeHtmlBody || plainTextToHtml(mailUi.composeBody || existingDraft?.body.join('\n') || ''));
		const focusBodyOnOpen = untrack(() => mailUi.composeFocusBody);
		const editor = new Editor({
			element,
			extensions: [StarterKit.configure({ blockquote: false, link: { openOnClick: false, defaultProtocol: 'https', protocols: ['mailto'] } }), Blockquote.configure({ HTMLAttributes: { style: richBlockquoteStyle } }), Image.configure({ allowBase64: true }), TableKit, TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyleKit],
			content: sanitizeRichHtml(initial),
			editorProps: { attributes: { class: 'mail-rich-content mail-rich-editor min-h-full outline-none', role: 'textbox', 'aria-label': 'Message body', 'aria-multiline': 'true' } },
			onTransaction: ({ editor }) => {
				editorState = { editor };
				bodyText = editor.isEmpty ? '' : editor.getText().trim() || 'Rich content';
			},
			onUpdate: () => { notice = ''; }
		});
		editorState = { editor };
		bodyText = editor.isEmpty ? '' : editor.getText().trim() || 'Rich content';
		let focusFrame = 0;
		focusFrame = requestAnimationFrame(() => {
			focusFrame = requestAnimationFrame(() => {
				if (editor.isDestroyed || !mailUi.composeOpen) return;
				if (focusBodyOnOpen) editor.commands.focus('start');
				else recipientField?.focus();
			});
		});
		return () => {
			if (focusFrame) cancelAnimationFrame(focusFrame);
			editor.destroy();
			editorState = { editor: null };
		};
	});

	function addRecipient(value = recipientInput) {
		const addresses = splitRecipientAddresses(value);
		if (!addresses.length) return;
		if (addresses.some((email) => !isEmailAddress(email))) {
			notice = 'Check the recipient email address.';
			return;
		}
		recipients = [...new Set([...recipients, ...addresses])];
		recipientInput = '';
		notice = '';
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
		selectedContacts = recipients.filter((email) => recentContacts.includes(email));
	}

	function applyContacts() {
		recipients = [...new Set([...recipients.filter((email) => !recentContacts.includes(email)), ...selectedContacts])];
		contactsOpen = false;
		recipientField?.focus();
	}

	function removeContacts() {
		recipients = recipients.filter((email) => !selectedContacts.includes(email));
		selectedContacts = [];
	}

	async function addAttachments(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files) {
			const files = await Promise.all(Array.from(input.files).map(async (file) => {
				let storageId: string | undefined;
				try { storageId = await storeAttachment(file); }
			catch { toast.warning('Attachment storage is unavailable; this file will last until refresh.'); }
				return { filename: file.name, size: file.size, contentType: file.type, file, storageId };
			}));
			attachments = [...attachments, ...files];
		}
		input.value = '';
	}

	function removeAttachment(index: number) {
		const id = attachments[index]?.storageId;
		if (id) void removeStoredAttachment(id);
		attachments = attachments.filter((_, current) => current !== index);
	}

	function clearContent() {
		clearConfirmOpen = true;
	}

	function confirmClearContent() {
		for (const attachment of attachments) if (attachment.storageId) void removeStoredAttachment(attachment.storageId);
		editorState.editor?.commands.clearContent();
		recipients = [];
		recipientInput = '';
		subject = '';
		attachments = [];
		clearConfirmOpen = false;
		notice = '';
		toast.info('Message cleared.');
	}

	function formatBytes(bytes: number) {
		return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function openLink() {
		const editor = editorState.editor;
		if (!editor || (editor.state.selection.empty && !editor.isActive('link'))) {
			notice = 'Select some text to turn it into a link.';
			return;
		}
		linkUrl = editor.getAttributes('link').href || 'https://';
		linkOpen = true;
		requestAnimationFrame(() => linkInput?.focus());
	}

	function applyLink() {
		const url = normalizeRichLink(linkUrl);
		if (!url) {
			notice = 'Enter a valid web or email link.';
			return;
		}
		linkOpen = false;
		editorState.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}

	function removeLink() {
		editorState.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
		linkOpen = false;
	}

	function insertEmoji(emoji: string) {
		editorState.editor?.chain().focus().insertContent(emoji).run();
		emojiOpen = false;
	}

	function addImage() {
		const src = normalizeRichImage(imageUrl.trim());
		if (!src) { notice = 'Enter a valid image URL.'; return; }
		editorState.editor?.chain().focus().setImage({ src, alt: 'Email image' }).run();
		imageOpen = false;
		imageUrl = '';
	}

	function uploadImage(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/') || file.size > 1_000_000) { notice = 'Choose an image smaller than 1 MB.'; return; }
		const reader = new FileReader();
		reader.onload = () => {
			const src = normalizeRichImage(String(reader.result ?? ''));
			if (src) editorState.editor?.chain().focus().setImage({ src, alt: file.name }).run();
		};
		reader.readAsDataURL(file);
		imageOpen = false;
	}

	function openSource() {
		sourceHtml = editorState.editor?.getHTML() ?? '';
		sourceOpen = true;
	}

	function applySource() {
		editorState.editor?.commands.setContent(sanitizeRichHtml(sourceHtml));
		sourceOpen = false;
	}

	function readBody() {
		const editor = editorState.editor;
		const text = editor?.getText().trim() ?? '';
		return { text, html: editor && !editor.isEmpty ? sanitizeRichHtml(editor.getHTML()) : '' };
	}

	function focusEditorFromBlankArea(event: PointerEvent) {
		if (event.target !== event.currentTarget) return;
		editorState.editor?.commands.focus('end');
	}

	function saveDraft() {
		const pendingRecipients = splitRecipientAddresses(recipientInput).filter(isEmailAddress);
		const draftRecipients = [...new Set([...recipients, ...pendingRecipients])];
		const cleanSubject = subject.trim();
		const { text, html } = readBody();
		if (!cleanSubject && !draftRecipients.length && !html && !attachments.length) {
			if (draftId) void deleteDrafts([draftId]);
			hideComposer();
			return;
		}
		const id = draftId || `draft:${crypto.randomUUID()}`;
		const existing = mailMessages.find((message) => message.id === id);
		const draft: MailMessage = {
			id,
			from: senderName,
			address: sender,
			initials: senderName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
			folder: 'drafts' as const,
			subject: cleanSubject || '(No subject)',
			preview: text.slice(0, 180) || (html ? 'Rich content' : draftRecipients.join(', ')),
			body: text ? [text] : [],
			htmlBody: html || undefined,
			recipients: draftRecipients,
			attachments: [...attachments],
			time: 'Now',
			date: 'Just now',
			timestamp: new Date().toISOString(),
			read: true,
			starred: false,
			archived: false,
			ownerEmail: apiUser.value?.email
		};
		if (existing) Object.assign(existing, draft);
		else mailMessages.unshift(draft);
		persistDraft(draft);
		hideComposer();
	}

	function close() {
		saveDraft();
	}

	async function prepareMessage(event: SubmitEvent) {
		event.preventDefault();
		if (sending) return;
		const pendingRecipients = splitRecipientAddresses(recipientInput);
		if (pendingRecipients.some((email) => !isEmailAddress(email)) || recipients.some((email) => !isEmailAddress(email))) {
			notice = 'Check the recipient email address.';
			recipientField?.focus();
			return;
		}
		const toRecipients = [...new Set([...recipients, ...pendingRecipients])];
		if (!toRecipients.length) {
			notice = 'Add at least one recipient.';
			return;
		}
		recipients = toRecipients;
		recipientInput = '';
		const cleanSubject = subject.trim();
		if (!cleanSubject) { notice = 'Add a subject.'; return; }
		const { text, html } = readBody();
		if (!html) { notice = 'Write a message before sending.'; return; }
		if (!hasPermission('Send email')) { notice = 'Your role cannot send mail.'; return; }
		sending = true;
		const apiAttachments: { filename: string; type?: string; content: string }[] = [];
		try {
			for (const attachment of attachments) {
				if (!attachment.file) throw new Error(`Attachment “${attachment.filename}” is unavailable.`);
				const bytes = new Uint8Array(await attachment.file.arrayBuffer());
				let binary = '';
				for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
				apiAttachments.push({ filename: attachment.filename, type: attachment.contentType || attachment.file.type, content: btoa(binary) });
			}
			await sendApiEmail({
				accountId: mailUi.currentAccountId,
				name: senderName,
				receiveEmail: toRecipients,
				text,
				content: html,
				subject: cleanSubject,
				attachments: apiAttachments
			});
			if (draftId) {
				await deleteDrafts([draftId]);
				mailMessages.splice(0, mailMessages.length, ...mailMessages.filter((message) => message.id !== draftId));
			}
			mailUi.refreshKey += 1;
			hideComposer();
			toast.success('Message sent.');
			void goto('/sent');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Message could not be sent.');
		} finally {
			sending = false;
		}
	}
</script>

	<Dialog.Root open={mailUi.composeOpen} onOpenChange={(open) => { if (!open) close(); }}>
	<Dialog.Content showCloseButton={false} class="fixed bottom-0 left-auto right-0 top-auto flex w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border bg-background p-0 shadow-2xl {fullscreen ? 'left-0 right-0 top-0 h-svh max-h-svh rounded-none' : 'max-h-[min(760px,100svh)] rounded-t-2xl sm:bottom-5 sm:right-5 sm:max-w-[620px] sm:rounded-xl'}">
		<div class="flex shrink-0 items-center justify-between bg-muted/50 px-4 py-3">
			<div><Dialog.Title id="compose-title" class="text-xs font-semibold">{draftId ? 'Edit draft' : 'New message'}</Dialog.Title><Dialog.Description class="mt-0.5 text-[9px] text-muted-foreground">From {senderName} &lt;{sender}&gt;</Dialog.Description></div>
			<div class="flex items-center gap-1"><Button variant="ghost" size="icon-xs" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen composer'} onclick={() => (fullscreen = !fullscreen)}>{#if fullscreen}<Minimize2 data-icon="inline-start" />{:else}<Maximize2 data-icon="inline-start" />{/if}</Button><Button variant="ghost" size="icon-xs" aria-label="Close composer" onclick={close}><X data-icon="inline-start" /></Button></div>
		</div>
		<form class="flex min-h-0 flex-1 flex-col px-4" onsubmit={prepareMessage}>
			<div class="relative flex min-h-11 flex-wrap items-center gap-1.5 border-b py-2 text-xs">
				<span class="mr-1 text-[10px] text-muted-foreground">To</span>
				{#each recipients as email, index (email)}
					<span class="inline-flex max-w-[230px] items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px]"><span class="truncate">{email}</span><button type="button" aria-label={`Remove ${email}`} onclick={() => (recipients = recipients.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>
				{/each}
				<Input bind:ref={recipientField} bind:value={recipientInput} type="text" aria-label="Recipient email" placeholder={recipients.length ? 'Add another recipient' : 'name@example.com'} class="h-7 min-w-[150px] flex-1 border-0 px-0 text-[11px] shadow-none focus-visible:ring-0" onkeydown={handleRecipientKeydown} onblur={() => { if (recipientInput.trim()) addRecipient(); }} />
				<div class="relative"><Button type="button" variant="ghost" size="icon-xs" aria-label="Choose recent contacts" onclick={openContacts}><ContactRound data-icon="inline-start" /></Button>{#if contactsOpen}<div class="absolute right-0 top-8 z-20 w-[280px] rounded-xl border bg-popover p-2 shadow-lg"><p class="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Recent contacts</p><div class="max-h-48 overflow-y-auto">{#each recentContacts as contact (contact)}<label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[10px] hover:bg-muted"><Switch checked={selectedContacts.includes(contact)} onCheckedChange={() => (selectedContacts = selectedContacts.includes(contact) ? selectedContacts.filter((item) => item !== contact) : [...selectedContacts, contact])} aria-label={`Select ${contact}`} size="sm" /><span class="min-w-0 truncate">{contact}</span></label>{:else}<p class="px-2 py-4 text-[10px] text-muted-foreground">No recent contacts yet.</p>{/each}</div><div class="mt-2 flex justify-end gap-1 border-t pt-2"><Button type="button" variant="ghost" size="xs" disabled={!selectedContacts.length} onclick={removeContacts}>Clear selected</Button><Button type="button" size="xs" onclick={applyContacts}>Choose</Button></div></div>{/if}</div>
			</div>
			<label class="flex items-center gap-3 border-b py-2.5 text-xs"><span class="w-12 shrink-0 text-[10px] text-muted-foreground">Subject</span><Input bind:value={subject} type="text" aria-label="Subject" placeholder="Subject" class="h-8 min-w-0 border-0 px-0 text-xs shadow-none focus-visible:ring-0" /></label>
			<div class="relative flex flex-wrap items-center gap-1 border-b py-2">
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('bold') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Bold" aria-pressed={editorState.editor?.isActive('bold') ?? false} onclick={() => editorState.editor?.chain().focus().toggleBold().run()}><Bold data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('italic') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Italic" aria-pressed={editorState.editor?.isActive('italic') ?? false} onclick={() => editorState.editor?.chain().focus().toggleItalic().run()}><Italic data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('underline') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Underline" aria-pressed={editorState.editor?.isActive('underline') ?? false} onclick={() => editorState.editor?.chain().focus().toggleUnderline().run()}><Underline data-icon="inline-start" /></Button>
				<span class="mx-1 h-5 w-px bg-border"></span>
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('bulletList') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Bulleted list" aria-pressed={editorState.editor?.isActive('bulletList') ?? false} onclick={() => editorState.editor?.chain().focus().toggleBulletList().run()}><List data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('orderedList') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Numbered list" aria-pressed={editorState.editor?.isActive('orderedList') ?? false} onclick={() => editorState.editor?.chain().focus().toggleOrderedList().run()}><ListOrdered data-icon="inline-start" /></Button>
				<span class="mx-1 h-5 w-px bg-border"></span>
				<Button type="button" variant="ghost" size="icon-sm" class={editorState.editor?.isActive('link') ? 'bg-secondary text-secondary-foreground' : ''} aria-label="Add or edit link" aria-pressed={editorState.editor?.isActive('link') ?? false} onclick={openLink}><Link2 data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-sm" aria-label="More formatting" aria-expanded={moreOpen} class={moreOpen ? 'bg-secondary text-secondary-foreground' : ''} onclick={() => (moreOpen = !moreOpen)}><MoreHorizontal data-icon="inline-start" /></Button>
				{#if linkOpen}
					<div class="absolute left-0 top-full z-20 mt-2 flex w-[min(320px,calc(100vw-48px))] items-center gap-2 rounded-xl border bg-popover p-2 shadow-lg">
						<Input bind:ref={linkInput} bind:value={linkUrl} aria-label="Link URL" class="h-8 min-w-0 flex-1 text-xs" onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink(); } if (event.key === 'Escape') linkOpen = false; }} />
						{#if editorState.editor?.isActive('link')}<Button type="button" variant="ghost" size="sm" onclick={removeLink}>Remove</Button>{/if}
						<Button type="button" size="sm" onclick={applyLink}>Add</Button>
					</div>
				{/if}
			</div>
			{#if moreOpen}<div class="relative flex flex-wrap items-center gap-1 border-b py-2">
				<SelectControl bind:value={fontSize} items={['8px', '10px', '12px', '14px', '16px', '18px', '24px', '36px'].map((size) => ({ value: size, label: size }))} aria-label="Font size" class="h-8 text-[10px]" onValueChange={(value) => value && editorState.editor?.chain().focus().setFontSize(value).run()} />
				<label class="flex h-8 items-center gap-1 rounded-md border px-1.5 text-[10px]" title="Text color">A<input bind:value={textColor} type="color" aria-label="Text color" class="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" onchange={() => editorState.editor?.chain().focus().setColor(textColor).run()} /></label>
				<label class="flex h-8 items-center gap-1 rounded-md border px-1.5 text-[10px]" title="Highlight color">▣<input bind:value={backgroundColor} type="color" aria-label="Highlight color" class="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" onchange={() => editorState.editor?.chain().focus().setBackgroundColor(backgroundColor).run()} /></label>
				<span class="mx-1 h-5 w-px bg-border"></span>
				<Button type="button" variant="ghost" size="icon-sm" aria-label="Align left" onclick={() => editorState.editor?.chain().focus().setTextAlign('left').run()}><AlignLeft data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Align center" onclick={() => editorState.editor?.chain().focus().setTextAlign('center').run()}><AlignCenter data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Align right" onclick={() => editorState.editor?.chain().focus().setTextAlign('right').run()}><AlignRight data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Justify" onclick={() => editorState.editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify data-icon="inline-start" /></Button>
				<Button type="button" variant="ghost" size="icon-sm" aria-label="Decrease list indent" onclick={() => editorState.editor?.chain().focus().liftListItem('listItem').run()}><IndentDecrease data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Increase list indent" onclick={() => editorState.editor?.chain().focus().sinkListItem('listItem').run()}><IndentIncrease data-icon="inline-start" /></Button>
				<span class="mx-1 h-5 w-px bg-border"></span>
				<Button type="button" variant="ghost" size="icon-sm" aria-label="Insert emoji" onclick={() => { emojiOpen = !emojiOpen; imageOpen = false; tableOpen = false; }}><Smile data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Insert image" onclick={() => { imageOpen = !imageOpen; emojiOpen = false; tableOpen = false; }}><ImagePlus data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Insert or edit table" onclick={() => { tableOpen = !tableOpen; emojiOpen = false; imageOpen = false; }}><Table2 data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Edit HTML source" onclick={openSource}><Code2 data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Preview message" onclick={() => (previewOpen = true)}><Eye data-icon="inline-start" /></Button>
				{#if emojiOpen}<div class="absolute left-0 top-full z-20 mt-2 flex max-w-full flex-wrap gap-1 rounded-xl border bg-popover p-2 shadow-lg">{#each ['🙂', '😊', '🎉', '👍', '❤️', '✅', '⭐', '📎', '🙏', '👋'] as emoji}<button type="button" class="rounded-md px-2 py-1 text-lg hover:bg-muted" aria-label={`Insert ${emoji}`} onclick={() => insertEmoji(emoji)}>{emoji}</button>{/each}</div>{/if}
				{#if imageOpen}<div class="absolute left-0 top-full z-20 mt-2 flex w-[min(350px,calc(100vw-48px))] flex-wrap items-center gap-2 rounded-xl border bg-popover p-2 shadow-lg"><Input bind:value={imageUrl} type="url" placeholder="https://image.example/photo.png" aria-label="Image URL" class="h-8 min-w-0 flex-1 text-xs" /><Button type="button" size="xs" onclick={addImage}>Insert</Button><Button type="button" variant="outline" size="xs" onclick={() => imageInput?.click()}>Upload</Button><input bind:this={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" onchange={uploadImage} /></div>{/if}
				{#if tableOpen}<div class="absolute left-0 top-full z-20 mt-2 flex max-w-[330px] flex-wrap gap-1 rounded-xl border bg-popover p-2 shadow-lg"><Button type="button" variant="outline" size="xs" onclick={() => { editorState.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); tableOpen = false; }}>Insert 3 × 3</Button><Button type="button" variant="ghost" size="xs" onclick={() => editorState.editor?.chain().focus().addRowAfter().run()}>Add row</Button><Button type="button" variant="ghost" size="xs" onclick={() => editorState.editor?.chain().focus().addColumnAfter().run()}>Add column</Button><Button type="button" variant="ghost" size="xs" onclick={() => editorState.editor?.chain().focus().deleteRow().run()}>Delete row</Button><Button type="button" variant="ghost" size="xs" onclick={() => editorState.editor?.chain().focus().deleteColumn().run()}>Delete column</Button><Button type="button" variant="ghost" size="xs" class="text-destructive" onclick={() => { editorState.editor?.chain().focus().deleteTable().run(); tableOpen = false; }}>Delete table</Button></div>{/if}
			</div>{/if}
			<div bind:this={editorContainer} data-empty={!bodyText} data-placeholder="Write your message…" class="mail-rich-editor-shell relative flex min-h-[180px] min-w-0 flex-1 flex-col overflow-y-auto py-4 text-sm leading-relaxed" onpointerdown={focusEditorFromBlankArea}></div>
			{#if attachments.length}<div class="mb-2 flex flex-wrap gap-2">{#each attachments as file, index (`${file.filename}-${index}`)}<span class="inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1.5 text-[9px]"><span class="max-w-[190px] truncate">{file.filename}</span><span class="text-muted-foreground">{formatBytes(file.size)}</span><button type="button" aria-label={`Remove ${file.filename}`} onclick={() => removeAttachment(index)}>×</button></span>{/each}</div>{/if}
			{#if notice}<p class="mb-2 text-[10px] text-muted-foreground" role="status">{notice}</p>{/if}
			<input bind:this={attachmentInput} type="file" multiple class="hidden" onchange={addAttachments} />
			<div class="flex shrink-0 items-center justify-between gap-3 border-t py-3">
				<div class="flex items-center gap-1"><Button type="submit" size="sm" class="rounded-full px-4" disabled={sending}>{#if sending}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Send data-icon="inline-start" />{/if}{sending ? 'Sending…' : 'Send'}</Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Add attachments" disabled={sending} onclick={() => attachmentInput?.click()}><Paperclip data-icon="inline-start" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="Clear message and attachments" disabled={sending} onclick={clearContent}><Eraser data-icon="inline-start" /></Button></div>
				<Button type="button" variant="ghost" size="sm" class="rounded-full text-muted-foreground" onclick={saveDraft}>Save draft</Button>
			</div>
		</form>
	</Dialog.Content>
	</Dialog.Root>

{#if sourceOpen}
	<Dialog.Root bind:open={sourceOpen}>
		<Dialog.Content class="z-[60] flex w-[calc(100vw-2rem)] max-h-[85svh] max-w-[760px] flex-col gap-0 p-4">
			<Dialog.Header><Dialog.Title id="source-title" class="text-sm font-semibold">HTML source</Dialog.Title><Dialog.Description class="text-[10px] text-muted-foreground">Unsupported tags and unsafe links are removed when applied.</Dialog.Description></Dialog.Header>
			<textarea bind:value={sourceHtml} spellcheck="false" aria-label="HTML source" class="mt-3 min-h-[280px] flex-1 resize-y rounded-lg border bg-muted/30 p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea>
			<div class="mt-3 flex justify-end gap-2"><Button variant="ghost" size="sm" onclick={() => (sourceOpen = false)}>Cancel</Button><Button size="sm" onclick={applySource}>Apply HTML</Button></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if previewOpen}
	<Dialog.Root bind:open={previewOpen}>
		<Dialog.Content showCloseButton={false} class="z-[60] flex w-[calc(100vw-2rem)] max-h-[85svh] max-w-[680px] flex-col gap-0 overflow-hidden p-0">
			<Dialog.Header class="flex-row items-center justify-between border-b px-4 py-3"><div><Dialog.Title id="compose-preview-title" class="text-sm font-semibold">{subject || '(No subject)'}</Dialog.Title><Dialog.Description class="mt-1 text-[10px]">To: {recipients.join(', ') || 'No recipients'}</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close preview" onclick={() => (previewOpen = false)}><X data-icon="inline-start" /></Button></Dialog.Header>
			<div class="min-h-0 overflow-y-auto p-4"><RichMailBody html={readBody().html} class="text-sm leading-relaxed" /></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if clearConfirmOpen}
	<Dialog.Root bind:open={clearConfirmOpen}>
		<Dialog.Content class="z-[60] w-[calc(100vw-2rem)] max-w-[390px] gap-0 p-5">
			<Dialog.Header><Dialog.Title class="text-sm font-semibold">Clear this message?</Dialog.Title><Dialog.Description class="text-[11px] leading-relaxed">This removes its recipients, content, and attachments.</Dialog.Description></Dialog.Header>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" onclick={() => (clearConfirmOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" onclick={confirmClearContent}>Clear message</Button></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
