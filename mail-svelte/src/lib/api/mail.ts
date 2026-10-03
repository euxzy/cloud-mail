import { apiQuery, apiRequest } from '$lib/api/client.js';
import type { MailAccount } from '$lib/mail-accounts.svelte.js';
import type { MailAttachment, MailMessage, MessageFolder } from '$lib/mail-data.svelte.js';
import { apiUser } from '$lib/api/session.svelte.js';

type ApiAccount = {
	accountId: number;
	email: string;
	name?: string;
	allReceive?: number;
	sort?: number;
};

type ApiAttachment = {
	key?: string;
	filename?: string;
	fileName?: string;
	size?: number;
	contentType?: string;
	mimeType?: string;
};

type ApiEmail = {
	emailId: number;
	accountId: number;
	sendEmail?: string;
	name?: string;
	toEmail?: string;
	subject?: string;
	text?: string;
	listText?: string;
	content?: string;
	recipient?: string | Array<{ address?: string; name?: string }>;
	createTime?: string;
	type: number;
	status?: number;
	unread?: number;
	isStar?: number;
	isDel?: number;
	userEmail?: string;
	attList?: ApiAttachment[];
};

function parseRecipients(raw?: ApiEmail['recipient']) {
	if (Array.isArray(raw)) return raw.map((item) => item.address).filter((value): value is string => Boolean(value));
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed.map((item) => typeof item === 'string' ? item : item?.address).filter((value): value is string => Boolean(value));
	} catch {
		return raw.split(',').map((email) => email.trim()).filter(Boolean);
	}
	return [];
}

function formatDate(value?: string) {
	if (!value) return { timestamp: new Date().toISOString(), time: '', date: '' };
	const normalized = value.includes('T') ? value : value.replace(' ', 'T');
	const parsed = new Date(normalized);
	if (Number.isNaN(parsed.getTime())) return { timestamp: value, time: value, date: value };
	return {
		timestamp: parsed.toISOString(),
		time: parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
		date: parsed.toLocaleString()
	};
}

function plainText(html?: string) {
	return (html ?? '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

function mapStatus(status?: number): MailMessage['status'] {
	return ({ 1: 'sent', 2: 'delivered', 3: 'bounced', 4: 'complained', 5: 'delayed', 7: 'no-recipient', 8: 'failed' } as Record<number, NonNullable<MailMessage['status']>>)[status ?? 0];
}

export function mapApiEmail(row: ApiEmail): MailMessage {
	const folder: MessageFolder = row.type === 1 ? 'sent' : 'inbox';
	const recipients = parseRecipients(row.recipient);
	const contentText = row.text || row.listText || plainText(row.content);
	const time = formatDate(row.createTime);
	const attachments: MailAttachment[] = (row.attList ?? []).map((item) => ({
		filename: item.filename || item.fileName || 'Attachment',
		size: Number(item.size ?? 0),
		contentType: item.contentType || item.mimeType,
		key: item.key
	}));
	const fromName = folder === 'sent' ? (apiUser.value?.name || apiUser.value?.email || row.name || '') : (row.name || row.sendEmail || 'Unknown sender');
	const fromAddress = folder === 'sent' ? (row.sendEmail || apiUser.value?.email || '') : (row.sendEmail || '');
	const preview = contentText.slice(0, 220) || '(No message content)';
	return {
		id: String(row.emailId),
		from: fromName,
		address: fromAddress,
		initials: fromName.split(/[\s@]+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CM',
		folder,
		subject: row.subject || '(No subject)',
		preview,
		body: contentText ? contentText.split(/\r?\n/) : [],
		htmlBody: row.content || undefined,
		recipients: folder === 'inbox' ? [row.toEmail].filter((email): email is string => Boolean(email)) : recipients,
		attachments,
		status: folder === 'sent' ? mapStatus(row.status) : undefined,
		timestamp: time.timestamp,
		time: time.time,
		date: time.date,
		read: folder === 'sent' || row.unread === 1,
		starred: row.isStar === 1,
		archived: false,
		deleted: row.isDel === 1,
		ownerEmail: row.userEmail || apiUser.value?.email
	};
}

export async function fetchApiAccounts() {
	const rows: ApiAccount[] = [];
	let accountId = 0;
	let lastSort: number | undefined;
	while (true) {
		const page = await apiRequest<ApiAccount[]>(apiQuery('/account/list', { accountId, lastSort, size: 30 }));
		rows.push(...(page ?? []));
		if ((page?.length ?? 0) < 30) break;
		const last = page.at(-1);
		if (!last || (Number(last.accountId) === accountId && Number(last.sort) === lastSort)) break;
		accountId = Number(last.accountId);
		lastSort = Number(last.sort ?? 0);
	}
	const primaryId = apiUser.value?.account?.accountId;
	return (rows ?? []).map((row): MailAccount => ({
		id: Number(row.accountId),
		email: row.email,
		name: row.name || undefined,
		ownerEmail: apiUser.value?.email,
		primary: Number(row.accountId) === Number(primaryId) || row.email === apiUser.value?.email,
		pinned: Number(row.sort ?? 0) > 0,
		allMail: row.allReceive === 1
	}));
}

export type ApiMailboxPage = {
	messages: MailMessage[];
	cursor: number;
	hasMore: boolean;
};

export async function fetchApiMailbox(folder: 'inbox' | 'sent' | 'starred', account: MailAccount | undefined, beforeId?: number): Promise<ApiMailboxPage> {
	let rows: ApiEmail[];
	if (folder === 'starred') {
		const data = await apiRequest<{ list: ApiEmail[] }>(apiQuery('/star/list', { emailId: beforeId, size: 50, full: 1 }));
		rows = data?.list ?? [];
	} else {
		if (!account) return { messages: [], cursor: beforeId ?? 0, hasMore: false };
		const data = await apiRequest<{ list: ApiEmail[] }>(apiQuery('/email/list', {
			accountId: account.id,
			type: folder === 'sent' ? 1 : 0,
			emailId: beforeId,
			size: 50,
			timeSort: 0,
			allReceive: account.allMail ? 1 : 0,
			full: 1
		}));
		rows = data?.list ?? [];
	}
	return {
		messages: rows.filter((row) => row.status !== 6).map(mapApiEmail),
		cursor: Number(rows.at(-1)?.emailId ?? beforeId ?? 0),
		hasMore: rows.length === 50
	};
}

export async function fetchApiMessage(id: string, folder: 'inbox' | 'sent', account: MailAccount | undefined) {
	if (!account) return null;
	const emailId = Number(id);
	if (!Number.isFinite(emailId) || emailId <= 0) return null;
	const data = await apiRequest<{ list: ApiEmail[] }>(apiQuery('/email/list', {
		accountId: account.id, type: folder === 'sent' ? 1 : 0, emailId: emailId + 1, size: 50,
		timeSort: 0, allReceive: account.allMail ? 1 : 0, full: 1
	}));
	const row = (data?.list ?? []).find((item) => Number(item.emailId) === emailId);
	return row ? mapApiEmail(row) : null;
}

export async function fetchApiStarredMessage(id: string) {
	const emailId = Number(id);
	if (!Number.isFinite(emailId) || emailId <= 0) return null;
	const data = await apiRequest<{ list: ApiEmail[] }>(apiQuery('/star/list', { emailId: emailId + 1, size: 50, full: 1 }));
	const row = (data?.list ?? []).find((item) => Number(item.emailId) === emailId);
	return row ? mapApiEmail(row) : null;
}

export async function fetchApiAllMessages(params: Record<string, string | number | boolean | undefined>) {
	const data = await apiRequest<{ list: ApiEmail[]; total: number }>(apiQuery('/allEmail/list', { ...params, full: 1 }));
	return { ...data, list: (data?.list ?? []).map(mapApiEmail) };
}

export async function markApiEmailsRead(ids: string[]) {
	return apiRequest('/email/read', { method: 'PUT', body: { emailIds: ids.map(Number) } });
}

export async function deleteApiEmails(ids: string[]) {
	return apiRequest(apiQuery('/email/delete', { emailIds: ids.join(',') }), { method: 'DELETE' });
}

export async function setApiEmailStar(emailId: string, starred: boolean) {
	if (starred) return apiRequest('/star/add', { method: 'POST', body: { emailId: Number(emailId) } });
	return apiRequest(apiQuery('/star/cancel', { emailId }), { method: 'DELETE' });
}

export async function addApiAccount(email: string, token = '') {
	return apiRequest('/account/add', { method: 'POST', body: { email: email.trim(), token } });
}

export async function renameApiAccount(accountId: number, name: string) {
	return apiRequest('/account/setName', { method: 'PUT', body: { accountId, name } });
}

export async function setApiAccountAllMail(accountId: number) {
	return apiRequest('/account/setAllReceive', { method: 'PUT', body: { accountId } });
}

export async function pinApiAccount(accountId: number) {
	return apiRequest('/account/setAsTop', { method: 'PUT', body: { accountId } });
}

export async function deleteApiAccount(accountId: number) {
	return apiRequest(apiQuery('/account/delete', { accountId }), { method: 'DELETE' });
}

export async function sendApiEmail(params: {
	accountId: number;
	name: string;
	receiveEmail: string[];
	text: string;
	content: string;
	subject: string;
	attachments: { filename: string; type?: string; content: string }[];
}) {
	return apiRequest('/email/send', { method: 'POST', body: params });
}
