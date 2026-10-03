import { adminRoles, adminUsers, inviteCodes } from '$lib/admin-data.svelte.js';
import { mailAccounts, type MailAccount } from '$lib/mail-accounts.svelte.js';
import { mailMessages, type MailMessage } from '$lib/mail-data.svelte.js';
import { mailUi } from '$lib/mail-ui.svelte.js';
import { loadAttachment } from '$lib/attachment-store.js';
import { readPreviewSnapshot, writePreviewSnapshot } from '$lib/preview-data-store.js';

const dataKey = 'cloud-mail-local-data-v1';
const sessionKey = 'cloud-mail-local-session-v1';

export const previewSession = $state({ email: '', name: '', role: '' });
export const recentContacts = $state<string[]>(['nisa@ruangrupa.co', 'adrian@northstar.studio', 'maya@kawan.id', 'raka@studio-sore.com']);

export function hasPreviewPermission(permission: string) {
	if (previewSession.role === 'Administrator') return true;
	const role = adminRoles.find((item) => item.name === previewSession.role);
	return role?.permissions?.includes(permission) ?? false;
}

export function loadPreviewSession() {
	try {
		const stored = JSON.parse(localStorage.getItem(sessionKey) || 'null');
		if (stored?.email && stored?.name) {
			Object.assign(previewSession, stored);
			mailUi.currentAccountId = mailAccounts.find((account) => (account.ownerEmail ?? 'sarah@cloudmail.id') === stored.email)?.id ?? 0;
		}
	} catch {
		localStorage.removeItem(sessionKey);
	}
}

async function hashPassword(password: string, salt: string) {
	const bytes = new TextEncoder().encode(`${salt}:${password}`);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function setPreviewPassword(email: string, password: string) {
	const user = adminUsers.find((item) => item.email.toLowerCase() === email.toLowerCase());
	if (!user) return false;
	user.passwordSalt = crypto.randomUUID();
	user.passwordHash = await hashPassword(password, user.passwordSalt);
	return true;
}

export async function signInPreview(email: string, password?: string) {
	const user = adminUsers.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
	if (!user) return 'No local account uses this email.';
	if (user.status !== 'Active') return 'This account is not active.';
	if (user.passwordHash && password !== undefined && await hashPassword(password, user.passwordSalt ?? '') !== user.passwordHash) return 'Incorrect password.';
	Object.assign(previewSession, { email: user.email, name: user.name, role: user.role });
	mailUi.currentAccountId = mailAccounts.find((account) => (account.ownerEmail ?? 'sarah@cloudmail.id') === user.email)?.id ?? 0;
	localStorage.setItem(sessionKey, JSON.stringify(previewSession));
	return null;
}

export function signOutPreview() {
	Object.assign(previewSession, { email: '', name: '', role: '' });
	localStorage.removeItem(sessionKey);
}

export function renamePreviewProfile(name: string) {
	const user = adminUsers.find((item) => item.email === previewSession.email);
	if (!user) return;
	user.name = name;
	previewSession.name = name;
	localStorage.setItem(sessionKey, JSON.stringify(previewSession));
}

export function syncPreviewSession() {
	if (!previewSession.email) return;
	const user = adminUsers.find((item) => item.email === previewSession.email);
	if (!user || user.status !== 'Active') { signOutPreview(); return; }
	if (user.name !== previewSession.name || user.role !== previewSession.role) {
		previewSession.name = user.name;
		previewSession.role = user.role;
		localStorage.setItem(sessionKey, JSON.stringify(previewSession));
	}
}

export async function hydratePreviewData() {
	try {
		let stored: any;
		try { stored = await readPreviewSnapshot(); }
		catch { stored = null; }
		if (!stored) stored = JSON.parse(localStorage.getItem(dataKey) || 'null');
		if (!stored || typeof stored !== 'object') return;
		if (Array.isArray(stored.messages)) mailMessages.splice(0, mailMessages.length, ...stored.messages);
		if (Array.isArray(stored.accounts)) mailAccounts.splice(0, mailAccounts.length, ...(stored.accounts as MailAccount[]).map((account) => ({ ...account, ownerEmail: account.ownerEmail ?? 'sarah@cloudmail.id' })));
		if (Array.isArray(stored.users)) adminUsers.splice(0, adminUsers.length, ...stored.users);
		if (Array.isArray(stored.roles)) adminRoles.splice(0, adminRoles.length, ...stored.roles);
		if (Array.isArray(stored.codes)) inviteCodes.splice(0, inviteCodes.length, ...stored.codes);
		if (Array.isArray(stored.contacts)) recentContacts.splice(0, recentContacts.length, ...stored.contacts);
	} catch {
		localStorage.removeItem(dataKey);
	}
}

export async function restorePreviewAttachments() {
	await Promise.all(mailMessages.flatMap((message) => message.attachments ?? []).map(async (attachment) => {
		if (!attachment.storageId || attachment.file) return;
		try { attachment.file = await loadAttachment(attachment.storageId) ?? undefined; }
		catch { /* Keep file metadata if local storage is unavailable. */ }
	}));
}

let writeQueue = Promise.resolve();

export function persistPreviewData(): Promise<void> {
	const messages = mailMessages.map((message: MailMessage) => ({
		...message,
		attachments: message.attachments?.map(({ file: _file, ...metadata }) => metadata)
	}));
	const snapshot = JSON.parse(JSON.stringify({
		messages,
		accounts: mailAccounts,
		users: adminUsers,
		roles: adminRoles,
		codes: inviteCodes,
		contacts: [...recentContacts]
	}));
	writeQueue = writeQueue.catch(() => undefined).then(async () => {
		try { await writePreviewSnapshot(snapshot); localStorage.removeItem(dataKey); }
		catch { try { localStorage.setItem(dataKey, JSON.stringify(snapshot)); } catch { /* Browser storage is full. */ } }
	});
	return writeQueue;
}
